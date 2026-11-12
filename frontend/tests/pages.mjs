import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const sitePath = path => new URL(base + path).pathname;
const chatEnabled = process.env.VITE_ENABLE_CHAT === 'true';
const out = process.env.QA_DIR || '/tmp/ac215-course-qa/pages-qa-current';
await mkdir(out, { recursive: true });
const specs = [
  { path: '/schedule.html', label: 'Schedule', title: 'Schedule | AC215', heading: /^Schedule\.$/ },
  { path: '/policy.html', label: 'Policy', title: 'Course policy | AC215', heading: /^Course policy\.$/ },
  { path: '/tutorials.html', label: 'Tutorials', title: 'Tutorials | AC215', heading: /^Tutorials\.$/ },
  { path: '/faqs.html', label: 'FAQs', title: 'FAQs | AC215', heading: /^FAQs\.$/ },
  { path: '/showcase.html', label: 'Project showcase', title: 'Project showcase | AC215', heading: /Project\s*showcase\./ },
  { path: '/milestones.html', label: 'Milestones', title: 'Milestones | AC215', heading: /^Milestones\.$/ },
];
const schedule = JSON.parse(await readFile(new URL('../src/data/course-pages/schedule.json', import.meta.url), 'utf8'));
const tutorialCount = (await readFile(new URL('../src/data/course-pages/tutorials.md', import.meta.url), 'utf8')).match(/^## Lecture \d+:/gm).length;
const faqCount = (await readFile(new URL('../src/data/course-pages/faqs.md', import.meta.url), 'utf8')).match(/^### \d+\./gm).length;
const report = { passed: [], failures: [], pageErrors: [], consoleErrors: [], consoleWarnings: [], missingAssets: [], failedRequests: [], apiRequests: [], navigationTransitions: [], evidence: [] };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl'] });
let page;
let phase = '';
function observe(current) {
  current.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) report.apiRequests.push(request.url()); });
  current.on('pageerror', error => report.pageErrors.push({ url: current.url(), message: error.message, name: error.name, stack: error.stack, phase }));
  current.on('console', message => {
    if (message.type() === 'error') report.consoleErrors.push({ url: current.url(), message: message.text(), location: message.location() });
    if (message.type() === 'warning') report.consoleWarnings.push({ url: current.url(), message: message.text(), location: message.location() });
  });
  current.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) report.missingAssets.push({ url: response.url(), status: response.status() });
  });
  current.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
}
async function screenshot(name) {
  const path = out + '/' + name + '.png'; await page.screenshot({ path }); report.evidence.push(path);
}
async function check(name, action) {
  phase = name;
  try { await action(); report.passed.push(name); console.log('PASS: ' + name); }
  catch (error) {
    report.failures.push({ name, message: String(error) }); console.log('FAIL: ' + name + ': ' + error.message);
    if (page && !page.isClosed()) await screenshot('failure-' + report.failures.length).catch(() => {});
  }
}
async function ready(spec) {
  await expect(page.getByRole('heading', { level: 1, name: spec.heading })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  assert.equal(new URL(page.url()).pathname, sitePath(spec.path));
  assert.equal(await page.title(), spec.title);
}
async function go(spec) { const response = await page.goto(base + spec.path); assert.equal(response.status(), 200); await ready(spec); }
async function theme(preference, resolved) {
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', preference);
  await expect(page.locator('html')).toHaveAttribute('data-theme', resolved);
  await expect(page.getByRole('button', { name: `Use ${preference} theme`, exact: true })).toHaveAttribute('aria-pressed', 'true');
}
async function clearViewportOverflow() { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page has horizontal overflow'); }

try {
  await check('Navigation keeps the header stationary while page content transitions in light, dark and mobile views', async () => {
    for (const [width, preference] of [[1440, 'light'], [1440, 'dark'], [390, 'light']]) {
      const navigation = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light' });
      await navigation.addInitScript(preference => {
        localStorage.setItem('ac215-theme', preference);
        addEventListener('pagereveal', event => {
          const revealed = { headerPresent: !!document.querySelector('.site-header'), styled: !!getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim() };
          window.__navigationCapture = event.viewTransition ? event.viewTransition.ready.then(async () => {
            const samples = [];
            let finished = false;
            event.viewTransition.finished.then(() => { finished = true; });
            do {
              const header = getComputedStyle(document.documentElement, '::view-transition-new(course-header)');
              const content = getComputedStyle(document.documentElement, '::view-transition-new(root)');
              samples.push({ headerOpacity: header.opacity, headerTransform: header.transform, headerAnimation: header.animationName, contentOpacity: Number(content.opacity), contentTranslate: content.translate });
              await new Promise(requestAnimationFrame);
            } while (!finished);
            return { ...revealed, transition: true, samples };
          }, error => ({ ...revealed, transition: false, error: error.message })) : Promise.resolve({ ...revealed, transition: false });
        });
      }, preference);
      page = await navigation.newPage(); observe(page);
      const response = await navigation.request.get(base + '/schedule.html');
      const html = await response.text(); assert.match(html, /Course navigation/); assert.match(html, /Virtual Environments and Virtual Machines/);
      await page.goto(base + '/'); await page.waitForLoadState('networkidle');
      for (const label of ['Schedule', 'Policy', 'Tutorials', 'Home']) {
        const nav = width < 1181 ? page.locator('.mobile-navigation') : page.getByRole('navigation', { name: 'Course navigation', exact: true });
        if (width < 1181) await nav.locator('summary').click();
        await nav.getByRole('link', { name: label, exact: true }).click();
        await page.waitForLoadState('networkidle');
        const capture = await page.evaluate(() => window.__navigationCapture);
        report.navigationTransitions.push({ width, preference, label, ...capture });
        assert.ok(capture?.headerPresent && capture.styled && capture.transition, 'Page arrived without its styled header or native transition: ' + JSON.stringify(capture));
        assert.ok(capture.samples.every(sample => sample.headerOpacity === '1' && sample.headerTransform === 'none' && sample.headerAnimation === 'none'), 'Header faded or moved during navigation');
        assert.ok(capture.samples.some(sample => sample.contentOpacity > 0 && sample.contentOpacity < 1), 'Page content did not transition');
      }
      await screenshot('navigation-' + width + '-' + preference); await navigation.close();
    }
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  page = await context.newPage(); observe(page);
  await check('Home exposes the syllabus, prerequisites and original course resources without chat', async () => {
    await page.goto(base + '/');
    await expect(page.getByRole('heading', { level: 1, name: /AI in production/ })).toBeVisible();
    await expect(page.locator('.enrollment-notice')).toContainText('Enrollment is closed');
    await expect(page.getByRole('link', { name: /Watch Prof\. Pavlos Protopapas/ })).toHaveAttribute('href', 'https://canvas.harvard.edu/courses/170012');
    await page.getByRole('link', { name: 'Prerequisites and course information', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Course information.', exact: true })).toBeInViewport();
    const information = page.locator('.course-information');
    await expect(information).toContainText('NumPy, Pandas, and Matplotlib');
    await expect(information).toContainText('meaningful modeling component');
    await expect(information).toContainText('15-minute team presentation');
    await expect(information).toContainText('Formaggio');
    await expect(information.locator('#course-topics-overview + p + ol > li')).toHaveCount(14);
    const sectionLinks = await information.getByRole('navigation', { name: 'Course information sections' }).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
    assert.deepEqual(sectionLinks, [
      '#course-introduction', '#learning-objectives', '#course-topics-overview', '#logistics',
      '#technologies-and-platforms', '#prerequisites', '#course-components', '#team-projects',
    ]);
    await expect(information.locator('.course-information-prose > hr')).toHaveCount(7);
    await expect(page.locator('.site-footer').getByRole('link', { name: 'Supplementary readings', exact: true })).toHaveAttribute('href', sitePath('/readings.html'));
    await information.getByRole('link', { name: 'Prerequisites', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prerequisites', exact: true })).toBeInViewport();
    await expect(page.locator('.people-section a.person-name')).toHaveCount(10);
    await expect(page.locator('noscript, .milestone-page-links')).toHaveCount(0);
    await clearViewportOverflow(); await screenshot('home-course-information-desktop');
  });
  await check('Real document navigation, active links, deep reload and browser history', async () => {
    await page.goto(base + '/');
    await expect(page.getByRole('heading', { level: 1, name: /AI in production/ })).toBeVisible();
    for (const spec of specs) {
      await page.getByRole('navigation', { name: 'Course navigation', exact: true }).getByRole('link', { name: spec.label, exact: true }).click();
      await ready(spec);
      await expect(page.locator('.nav-links a[aria-current="page"]')).toHaveAttribute('href', sitePath(spec.path));
      await page.reload(); await ready(spec);
    }
    await page.goBack(); await ready(specs[4]);
    await page.goBack(); await ready(specs[3]);
    await page.goForward(); await ready(specs[4]);
    await page.goForward(); await ready(specs[5]);
    await expect(page.locator('.milestone-list > li')).toHaveCount(5);
  });
  await check('Light/Dark/System preference survives page navigation and reload', async () => {
    await go(specs[0]); await theme('system', 'light');
    await page.getByRole('button', { name: 'Use dark theme', exact: true }).click(); await theme('dark', 'dark');
    await page.getByRole('navigation', { name: 'Course navigation', exact: true }).getByRole('link', { name: 'Policy', exact: true }).click();
    await ready(specs[1]); await theme('dark', 'dark'); await page.reload(); await theme('dark', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' }); await page.emulateMedia({ colorScheme: 'light' }); await theme('dark', 'dark');
    await page.getByRole('button', { name: 'Use system theme', exact: true }).click(); await theme('system', 'light');
    await page.emulateMedia({ colorScheme: 'dark' }); await theme('system', 'dark');
    await page.getByRole('navigation', { name: 'Course navigation', exact: true }).getByRole('link', { name: 'Tutorials', exact: true }).click();
    await ready(specs[2]); await theme('system', 'dark'); await page.emulateMedia({ colorScheme: 'light' }); await theme('system', 'light');
    await page.getByRole('button', { name: 'Use light theme', exact: true }).click(); await page.reload(); await theme('light', 'light');
    await page.getByRole('button', { name: 'Use system theme', exact: true }).click(); await theme('system', 'light');
  });
  await check('Schedule month filters preserve dates and local tutorial deep links', async () => {
    await go(specs[0]); await expect(page.locator('.schedule-table tbody tr')).toHaveCount(schedule.rows.length);
    for (const [month, label] of [['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December']]) {
      await page.getByRole('group', { name: 'Filter schedule by month' }).getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('.schedule-table tbody tr')).toHaveCount(schedule.rows.filter(row => row[1].split('/')[0] === month).length);
      const dates = await page.locator('.schedule-table tbody time').evaluateAll(elements => elements.map(element => element.dateTime));
      assert.ok(dates.every(date => date.startsWith('2026-' + month.padStart(2, '0') + '-')));
    }
    await page.getByRole('button', { name: 'All dates', exact: true }).click();
    const link = page.locator('.schedule-topic a').first(); assert.equal(await link.getAttribute('href'), sitePath('/tutorials.html') + '#lecture-1'); await link.click();
    await ready(specs[2]); assert.equal(new URL(page.url()).hash, '#lecture-1');
    await expect(page.locator('#lecture-1')).toBeInViewport(); await page.reload(); await expect(page.locator('#lecture-1')).toBeInViewport();
    assert.match(await page.locator('#lecture-1').innerText(), /^Lecture 1:/);
    assert.match(await page.locator('.tutorial-section').first().getByRole('link', { name: 'Ed lesson', exact: true }).getAttribute('href'), /^https:\/\/edstem\.org\/us\/courses\/97373\/lessons\//);
  });
  await check('Tutorial search, empty state, clear and non-overlapping desktop index', async () => {
    await go(specs[2]); await expect(page.locator('.tutorial-section')).toHaveCount(tutorialCount);
    const boxes = await page.locator('.page-index a').evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; }));
    assert.ok(boxes.every(box => box.height >= 44)); assert.ok(boxes.slice(1).every((box, index) => box.top >= boxes[index].bottom - 1), 'Tutorial index entries overlap');
    await page.getByLabel('Search tutorials').fill('Kubernetes');
    const count = await page.locator('.tutorial-section').count(); assert.ok(count > 0 && count < tutorialCount);
    assert.ok((await page.locator('.tutorial-section').allInnerTexts()).every(text => /kubernetes/i.test(text)));
    await page.getByRole('button', { name: 'Clear search tutorials', exact: true }).click(); await expect(page.locator('.tutorial-section')).toHaveCount(tutorialCount);
    await page.getByLabel('Search tutorials').fill('no-such-tutorial-zq947'); await expect(page.getByRole('heading', { name: 'No tutorials found.', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear search', exact: true }).click(); await expect(page.getByLabel('Search tutorials')).toHaveValue(''); await expect(page.locator('.tutorial-section')).toHaveCount(tutorialCount);
    await screenshot('tutorials-desktop');
  });
  await check('FAQ search, clear and native disclosure keyboard operation', async () => {
    await go(specs[3]); await expect(page.locator('.faq-item')).toHaveCount(faqCount);
    const item = page.locator('.faq-item').filter({ hasText: 'Can I use late days on the final milestone (MS5)?' });
    await item.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(item).toHaveAttribute('open', '');
    await expect(item.locator('.faq-answer')).toContainText('does not allow late days'); await page.keyboard.press('Space'); assert.equal(await item.getAttribute('open'), null);
    await page.getByLabel('Search questions').fill('late days'); const count = await page.locator('.faq-item').count(); assert.ok(count > 0 && count < faqCount);
    await page.getByRole('button', { name: 'Clear search questions', exact: true }).click(); await expect(page.locator('.faq-item')).toHaveCount(faqCount);
    await page.getByLabel('Search questions').fill('no-such-question-zq947'); await expect(page.getByRole('heading', { name: 'No questions found.', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear search', exact: true }).click(); await expect(page.getByLabel('Search questions')).toHaveValue(''); await expect(page.locator('.faq-item')).toHaveCount(faqCount);
    await screenshot('faqs-desktop');
  });
  await check('Policy scroll highlight, anchors and grade table; Showcase coming-soon state', async () => {
    await go(specs[1]); const index = page.getByRole('navigation', { name: 'On this page', exact: true });
    await page.locator('#late-policy').evaluate(heading => heading.scrollIntoView({ behavior: 'instant' }));
    await expect(index.locator('a[aria-current="location"]')).toHaveAttribute('href', '#late-policy');
    assert.equal(new URL(page.url()).hash, '');
    for (const id of ['grade-distribution', 'late-policy', 'policy-on-usage-of-publicly-available-class-material']) {
      await index.locator(`a[href="#${id}"]`).click(); assert.equal(new URL(page.url()).hash, '#' + id); await expect(page.locator('#' + id)).toBeInViewport();
      await expect(index.locator('a[aria-current="location"]')).toHaveAttribute('href', '#' + id);
    }
    const weights = await page.locator('.course-prose table tbody tr').evaluateAll(rows => rows.map(row => parseFloat(row.lastElementChild.textContent)));
    assert.deepEqual(weights, [8, 14, 18, 18, 24, 18]); assert.equal(weights.reduce((sum, value) => sum + value, 0), 100);
    await page.reload(); await expect(page.locator('#policy-on-usage-of-publicly-available-class-material')).toBeInViewport();
    await go(specs[4]); await expect(page.getByText('Coming soon.', { exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.showcase-scene img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await screenshot('showcase-desktop');
  });
  if (chatEnabled) await check('Chat opens on two pages, previews real local course notes and retains only in-page drafts', async () => {
    const response = await context.request.get(base + '/api/course'); assert.equal(response.status(), 200); assert.equal((await response.json()).answer_mode, 'sources', 'Paid model mode is outside this test');
    await go(specs[3]); await page.getByRole('button', { name: 'Open course chat', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Ask AC215', exact: true })).toBeVisible();
    await page.getByLabel('Your course question').fill('Where does the class meet?'); await page.getByRole('button', { name: 'Send question', exact: true }).click();
    await expect(page.locator('.guide-answer')).toContainText('SEC 1.321', { timeout: 15000 }); await expect(page.locator('.guide-mode-note')).toContainText('Notes preview.');
    await page.getByLabel('Your course question').fill('Draft on the FAQ page'); await page.getByRole('button', { name: 'Minimize chat', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Open course chat', exact: true }).click(); await expect(page.getByLabel('Your course question')).toHaveValue('Draft on the FAQ page'); await expect(page.locator('.chat-turn')).toHaveCount(1); await screenshot('faqs-chat-preview');
    await go(specs[0]); await page.getByRole('button', { name: 'Open course chat', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('.chat-turn')).toHaveCount(0); await expect(page.getByLabel('Your course question')).toHaveValue('');
    await page.getByRole('button', { name: 'Minimize chat', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), ['ac215-theme']); assert.equal(await page.evaluate(() => sessionStorage.length), 0); assert.deepEqual(await context.cookies(), []);
  });
  else await check('Default static website exposes no chat controls on any course page', async () => {
    for (const path of ['/', ...specs.map(spec => spec.path), '/readings.html', '/milestone1.html']) {
      await page.goto(base + path);
      await expect(page.locator('main h1')).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.chat-launcher, .course-chat, .ask-section')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Ask AC215|Open the course guide|Open course chat/ })).toHaveCount(0);
    }
  });
  await check('Readings and all five full milestone pages are local static documents', async () => {
    const readings = await readFile(new URL('../src/data/course-pages/readings.md', import.meta.url), 'utf8');
    const urls = [...readings.matchAll(/\]\((https:[^)]+)\)/g)].map(match => match[1]);
    await page.goto(base + '/readings.html');
    await expect(page.getByRole('heading', { level: 1, name: 'Supplementary readings.', exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    assert.deepEqual(await page.locator('.readings-page .course-prose a').evaluateAll(links => links.map(link => link.href)), urls);
    for (let index = 1; index <= 5; index++) {
      const response = await page.goto(base + '/milestone' + index + '.html'); assert.equal(response.status(), 200);
      assert.equal(await page.title(), 'Milestone ' + index + ' | AC215');
      await expect(page.locator('.milestone-page .milestone-meta')).toContainText('MS' + index);
      assert.ok((await page.locator('.milestone-page .milestone-prose').allInnerTexts()).join(' ').length > 2000);
      await page.reload(); await expect(page.locator('.milestone-page h1')).toBeVisible(); await page.waitForLoadState('networkidle');
      await clearViewportOverflow();
    }
  });
  await check('All five pages fit320/390/1440; native mobile Menu and index work', async () => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      for (const spec of specs) {
        await go(spec); await clearViewportOverflow();
        if (width < 500) {
          const menu = page.locator('.mobile-navigation'), summary = menu.locator('summary'); await summary.focus(); await page.keyboard.press('Space'); await expect(menu).toHaveAttribute('open', '');
          await expect(menu.getByRole('link', { name: spec.label, exact: true })).toHaveAttribute('aria-current', 'page');
          const box = await menu.locator('nav').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
          await page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('open'), null); await expect(summary).toBeFocused();
        }
        if (spec.path === '/tutorials.html' && width < 500) {
          const index = page.locator('.page-index'); assert.ok(await index.evaluate(element => element.scrollWidth > element.clientWidth));
          const heights = await index.locator('a').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height)); assert.ok(heights.every(height => height >= 44 && height < 100));
        }
        await screenshot(spec.path.slice(1, -5) + '-' + width);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go(specs[0]); const menu = page.locator('.mobile-navigation'); await menu.locator('summary').click(); await menu.getByRole('link', { name: 'Policy', exact: true }).click(); await ready(specs[1]); assert.equal(await menu.getAttribute('open'), null);
  });
  await check('Updated homepage anchors and document Home navigation retain their targets', async () => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 }); await go(specs[0]);
      if (width === 390) {
        const menu = page.locator('.mobile-navigation'); await menu.locator('summary').click(); await menu.getByRole('link', { name: 'Home', exact: true }).click();
      } else await page.getByRole('navigation', { name: 'Course navigation', exact: true }).getByRole('link', { name: 'Home', exact: true }).click();
      await page.waitForURL(url => url.pathname === sitePath('/')); await page.locator('.scene-canvas canvas').waitFor();
      for (const [label, id] of [['Explore the course', 'curriculum'], ['Teaching staff', 'people']]) {
        await page.getByRole('link', { name: label, exact: true }).click(); const expected = width === 390 ? 64 + 24 : 88 + 40;
        await expect.poll(() => page.locator('#' + id).evaluate((element, expected) => Math.abs(element.getBoundingClientRect().top - expected), expected)).toBeLessThan(2);
      }
      const homeNav = width < 1181 ? page.locator('.mobile-navigation') : page.locator('.nav-links');
      if (width < 1181) await homeNav.locator('summary').click();
      await homeNav.getByRole('link', { name: 'Home', exact: true }).click(); await page.waitForURL(url => url.pathname === sitePath('/')); await page.locator('.scene-canvas canvas').waitFor(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      const resources = page.getByRole('navigation', { name: 'Course resources', exact: true }); assert.equal(await resources.getByRole('link', { name: 'Discussion on Ed', exact: true }).getAttribute('href'), 'https://edstem.org/us/courses/97373/discussion'); assert.equal(await resources.getByRole('link', { name: 'Lectures on Ed', exact: true }).getAttribute('href'), 'https://edstem.org/us/courses/97373/lessons');
    }
  });
  await context.close();
  await check('No page, hydration, console or missing-asset errors', async () => {
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.missingAssets, []); assert.deepEqual(report.failedRequests, []);
    assert.deepEqual(report.consoleWarnings.filter(entry => /hydration|did not match|react/i.test(entry.message)), []);
    if (!chatEnabled) assert.deepEqual(report.apiRequests, [], 'The static website must not make backend requests');
  });
} finally {
  await browser.close(); report.completedAt = new Date().toISOString(); await writeFile(out + '/results.json', JSON.stringify(report, null, 2));
}
if (report.failures.length) process.exitCode = 1;

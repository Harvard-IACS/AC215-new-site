import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { routes, legacyRedirects, siteUrl } from '../.ssr/prerender.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://course.example';
const base = siteUrl('/');
async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await filesIn(path) : [path]));
  }
  return files;
}
function outputFile(path) {
  return join(dist, !path || path.endsWith('/') ? path + 'index.html' : path);
}
for (const route of routes) {
  for (const path of [route.path, ...(route.aliases || [])]) {
    const html = await readFile(outputFile(path), 'utf8');
    assert.ok(html.includes('aria-label="Course navigation"'), `Missing complete page: ${path}`);
    assert.ok(html.includes(`<title>${route.title}</title>`), `Wrong page title: ${path}`);
  }
}
for (const redirect of legacyRedirects) {
  assert.ok((await readFile(outputFile(redirect.path), 'utf8')).includes(`location.replace(${JSON.stringify(siteUrl(redirect.target))})`));
}

let checkedLinks = 0;
for (const file of await filesIn(dist)) {
  if (!file.endsWith('.html') && !file.endsWith('.css')) continue;
  const text = await readFile(file, 'utf8');
  const pageUrl = new URL(base + file.slice(dist.length), origin);
  const links = file.endsWith('.html') ? [...text.matchAll(/\b(?:href|src|srcset)="([^"\s]+)"/gi)] : [...text.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)];
  for (const [, href] of links) {
    if (href.startsWith('#') || /^(?:data:|https?:|mailto:|tel:|\/\/)/.test(href)) continue;
    const url = new URL(href.replaceAll('&amp;', '&'), pageUrl);
    assert.ok(url.pathname.startsWith(base), `Link escapes the course site: ${file}: ${href}`);
    const target = outputFile(decodeURIComponent(url.pathname.slice(base.length)));
    assert.ok((await stat(target)).isFile(), `Missing static target: ${href}`);
    checkedLinks++;
  }
}
if (process.env.VITE_ENABLE_CHAT !== 'true') {
  for (const file of await filesIn(dist)) {
    if (file.endsWith('.html') || file.endsWith('.js')) {
      const text = await readFile(file, 'utf8');
      assert.ok(!text.includes('/api/chat/stream'), `Chat API included in static site: ${file}`);
      assert.ok(!text.includes('Open course chat'), `Chat launcher included in static site: ${file}`);
    }
  }
}
console.log(`Static check passed: ${routes.length} course pages, all legacy aliases, ${checkedLinks} local links and assets; base ${base}.`);

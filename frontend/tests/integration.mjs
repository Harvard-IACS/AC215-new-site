import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const chatEnabled = process.env.VITE_ENABLE_CHAT === 'true';
const out = process.env.QA_DIR || '/tmp/ac215-course-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-webgl'] });
const results = [];
const record = message => {results.push(message); console.log("PASS: " + message);};
let page;
const errors = [];
const evidence = [];
let exchange;
const fixture = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', base);
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
  response.flushHeaders(); exchange = response;
  response.write('data: ' + JSON.stringify({ type: 'started', mode: 'sources' }) + '\n\n');
});
if (chatEnabled) await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const fixtureURL = chatEnabled ? 'http://127.0.0.1:' + fixture.address().port + '/stream' : null;
const emit = event => exchange.write('data: ' + JSON.stringify(event) + '\n\n');
const step = { id: 'controlled-read', filename: 'general.md', title: 'General course information' };
const answer = { type: 'answer', mode: 'sources', answer: 'Controlled preview answer.', sources: [{ filename: 'general.md', title: 'General course information', url: '/api/course/files/general.md' }] };
async function screenshot(page, name) { const path = out + '/' + name + '.png'; await page.screenshot({path}); evidence.push(path); }
// Observe public DOM, computed styles and browser transition events.
async function watchMotion(page, selector) {
  await page.evaluate(selector => {
    window.__qaMotion?.stop();
    const samples = [], ends = []; let active = true;
    const record = () => {
      const element = document.querySelector(selector);
      if (element) { const css = getComputedStyle(element); samples.push({height:element.getBoundingClientRect().height,opacity:Number(css.opacity),transform:css.transform,clipPath:css.clipPath,expanded:element.parentElement.querySelector(':scope > .disclosure-trigger')?.getAttribute('aria-expanded'),answer:!!element.closest('.chat-turn')?.querySelector('.guide-answer')}); }
      if (active) requestAnimationFrame(record);
    };
    const ended = event => {if(event.target.matches(selector)) ends.push({property:event.propertyName,answer:!!event.target.closest('.chat-turn')?.querySelector('.guide-answer')});};
    document.addEventListener('transitionend', ended); requestAnimationFrame(record);
    window.__qaMotion = {samples, ends, stop() {active=false;document.removeEventListener('transitionend',ended);}};
  }, selector);
}
async function motionEnded(page, property) { await expect.poll(() => page.evaluate(property => window.__qaMotion.ends.some(item => item.property === property), property), {timeout:10000}).toBe(true); }
async function motionEvidence(page, name) {
  const data = await page.evaluate(() => {window.__qaMotion.stop();return {samples:window.__qaMotion.samples,ends:window.__qaMotion.ends};});
  const path = out + '/' + name + '.json'; await writeFile(path, JSON.stringify(data,null,2)); evidence.push(path); return data;
}
async function openChat(page) { await page.getByRole('button', {name:'Open course chat',exact:true}).click(); await expect(page.getByRole('dialog', {name:'Ask AC215',exact:true})).toBeVisible(); }
async function sendQuestion(page, question) { await page.getByLabel('Your course question').fill(question); await page.getByRole('button', {name:'Send question',exact:true}).click(); }
async function clearChat(page) { await page.getByRole('button', {name:'Clear conversation',exact:true}).click(); await expect(page.locator('.chat-turn')).toHaveCount(0); }
async function watchTheme(page) {
  await page.evaluate(() => {
    window.__qaTheme?.stop();
    const samples = [], ends = [], captures = [];
    let active = true;
    const sample = () => {
      samples.push({time:performance.now(),target:document.documentElement.dataset.theme,color:getComputedStyle(document.body).backgroundColor});
      if (active) requestAnimationFrame(sample);
    };
    const ended = event => {if(event.target === document.body) ends.push(event.propertyName);};
    document.body.addEventListener('transitionend',ended);
    requestAnimationFrame(sample);
    window.__qaTheme = {samples,ends,captures,stop(){active=false;document.body.removeEventListener('transitionend',ended);}};
  });
}
async function themeEvidence(page, name) {
  const data = await page.evaluate(() => {window.__qaTheme.stop();return {samples:window.__qaTheme.samples,ends:window.__qaTheme.ends,captures:window.__qaTheme.captures};});
  const path = out + '/' + name + '.json';
  await writeFile(path,JSON.stringify(data,null,2)); evidence.push(path); return data;
}
async function saveScene(canvas, name) {
  const path = out + '/' + name + '.png';
  await canvas.evaluate((element,name)=>window.__qaTheme?.captures.push({name,phase:'before',time:performance.now(),color:getComputedStyle(document.body).backgroundColor}),name);
  const bytes = await canvas.screenshot({path,animations:'allow'});
  await canvas.evaluate((element,name)=>window.__qaTheme?.captures.push({name,phase:'after',time:performance.now(),color:getComputedStyle(document.body).backgroundColor}),name);
  evidence.push(path); return imageHash(bytes);
}
async function stableScene(canvas) {
  let previous, matching = 0, latest;
  await expect.poll(async () => {
    latest = imageHash(await canvas.screenshot());
    matching = latest === previous ? matching + 1 : 0;
    previous = latest; return matching;
  },{timeout:15000,intervals:[80,100,150]}).toBeGreaterThanOrEqual(2);
  return latest;
}
async function gradualTheme(page, canvas, mode, fromColor, toColor, beforeHash) {
  await watchTheme(page);
  await page.getByRole('button',{name:`Use ${mode} theme`,exact:true}).click();
  await assertTheme(page,mode,mode);
  await expect.poll(() => page.evaluate(({fromColor,toColor}) => window.__qaTheme.samples.some(item => item.color !== fromColor && item.color !== toColor),{fromColor,toColor})).toBe(true);
  const intermediateHash = await saveScene(canvas,'scene-to-'+mode+'-intermediate');
  await expect.poll(() => page.evaluate(() => window.__qaTheme.ends.includes('background-color'))).toBe(true);
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).toBe(toColor);
  await stableScene(canvas);
  const finalHash = await saveScene(canvas,'scene-'+mode+'-settled');
  assert.notEqual(finalHash,beforeHash,`The ${mode} scene never changed`);
  assert.notEqual(intermediateHash,beforeHash,`No intermediate ${mode} scene frame changed from its starting view`);
  assert.notEqual(intermediateHash,finalHash,`The ${mode} scene jumped straight to its final frame`);
  const samples = await themeEvidence(page,'theme-to-'+mode);
  assert.ok(new Set(samples.samples.map(item=>item.color)).size >= 4,'Theme needs multiple intermediate background colors');
  return finalHash;
}
async function journeyState(page) {
  return page.evaluate(() => {
    const experience = document.querySelector('.experience').getBoundingClientRect();
    const heading = document.querySelector('#classroom').getBoundingClientRect();
    const canvas = document.querySelector('.scene-canvas');
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 40;
    const range = heading.top - experience.top - offset;
    return {
      progress: Math.max(0,Math.min(1,-experience.top/range)),
      headingTop: heading.top,
      anchorOffset: offset,
      filter: getComputedStyle(canvas).filter,
      opacity: Number(getComputedStyle(canvas).opacity),
      caption: document.querySelector('.scene-caption').innerText,
    };
  });
}
async function scrollJourney(page, progress) {
  await page.evaluate(progress => {
    const experience = document.querySelector('.experience').getBoundingClientRect();
    const heading = document.querySelector('#classroom').getBoundingClientRect();
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 40;
    const range = heading.top - experience.top - offset;
    scrollTo({top:scrollY + experience.top + progress*range,behavior:'instant'});
  },progress);
  await expect.poll(async () => Math.abs((await journeyState(page)).progress-progress)).toBeLessThan(.002);
}
async function captureJourney(page, name) {
  const canvas = page.locator('.scene-canvas canvas');
  await stableScene(canvas);
  const hash = await saveScene(canvas,name);
  return {name,hash,...await journeyState(page),box:await canvas.boundingBox()};
}
async function expectClearHall(page) {
  await expect.poll(async()=>{const state=await journeyState(page);return {filter:state.filter,opacity:state.opacity};}).toEqual({filter:'none',opacity:1});
  await expect(page.locator('.scene-caption')).toContainText('SEC 1.321');
}
async function verifyClassroomModel(page) {
  const palette = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(Array.from(css).filter(key=>key.startsWith('--scene-')).map(key=>[key.slice(8),css.getPropertyValue(key).trim()]));
  });
  // This verifies the trusted source module's geometry and public model API.
  // Browser assertions below separately verify the emitted scene and scroll path.
  const T = await import('three');
  const {createLectureHallModel} = await import('../src/lecture-hall-model.js');
  const {createSECJourney} = await import('../src/sec-journey.js');
  const model = createLectureHallModel(T,palette);
  try {
    const seats = [], matrix = new T.Matrix4();
    let backs = 0;
    model.group.traverse(item=>{
      if (!item.isInstancedMesh) return;
      if (item.geometry.name === 'Hall seat back') backs += item.count;
      if (item.geometry.name !== 'Hall seat cushion') return;
      for(let index=0;index<item.count;index++) {
        item.getMatrixAt(index,matrix);
        const position = new T.Vector3(), rotation = new T.Quaternion(), scale = new T.Vector3();
        matrix.decompose(position,rotation,scale);
        seats.push({x:position.x,y:position.y,z:position.z,yaw:new T.Euler().setFromQuaternion(rotation).y});
      }
    });
    assert.equal(seats.length,300); assert.equal(backs,300);
    assert.equal(model.group.userData.hallSeatCount,300);
    assert.equal(model.group.userData.rearDoorwayCount,3);
    assert.equal(model.group.userData.doubleDoorSetCount,6);
    assert.deepEqual(model.group.userData.hallSeatBanks,[9,12,9]);
    assert.equal(model.group.userData.mainHallSeatCount,240);
    assert.equal(model.group.userData.rearHallSeatCount,60);
    assert.equal(model.group.userData.mainHallRows,8);
    assert.equal(model.group.userData.rearHallRows,2);
    assert.deepEqual(model.group.userData.rearSeatBanks,[15,15]);
    const rows = Map.groupBy(seats,seat=>seat.y.toFixed(3));
    assert.equal(rows.size,10);
    for(const row of rows.values()) {
      assert.equal(row.length,30);
      assert.ok(Math.max(...row.map(seat=>seat.z))-Math.min(...row.map(seat=>seat.z))>1,'A seating row is flat instead of curved');
      assert.ok(row.some(seat=>seat.yaw<-.05)&&row.some(seat=>seat.yaw>.05),'Outer chairs do not turn toward the screen');
    }
    const orderedRows=[...rows.values()].sort((a,b)=>a[0].y-b[0].y);
    const mainSeats=orderedRows.slice(0,8).flat(),rearSeats=orderedRows.slice(8).flat();
    assert.equal(mainSeats.length,240); assert.equal(rearSeats.length,60);
    assert.ok(rearSeats.every(seat=>Math.abs(seat.x)>1.7),'The rear seating blocks the clear center spine');
    for(const row of orderedRows.slice(8)) {
      assert.equal(row.filter(seat=>seat.x<0).length,15);
      assert.equal(row.filter(seat=>seat.x>0).length,15);
    }
    const frame = new T.Group();
    frame.position.set(-2,.12-4.3*.5,2); frame.rotation.y=-Math.PI/2; frame.scale.setScalar(.5); frame.add(model.group);
    const journey = createSECJourney(T,frame);
    const sample = progress => journey.sample(progress,728/576);
    for (const progress of [.62,.72]) {
      const current = sample(progress).position;
      const incoming = current.clone().sub(sample(progress-.0001).position);
      const outgoing = sample(progress+.0001).position.sub(current);
      assert.ok(incoming.length()>.001 && outgoing.length()>.001,'Camera stops at the wall or foyer');
      assert.ok(incoming.angleTo(outgoing)<.05,'Camera changes direction abruptly at the wall or foyer');
    }
    for (let step=60;step<75;step++) {
      const current = sample(step/100);
      const forward = current.target.clone().sub(current.position);
      const movement = sample((step+1)/100).position.sub(current.position);
      assert.ok(movement.dot(forward)>0,'Camera backs up during the wall passage');
    }
    const samples=Array.from({length:2001},(_,index)=>{
      const progress=.72+.28*index/2000; return {progress,...sample(progress)};
    });
    const outerMid=samples.filter(stage=>stage.innerDoorOpen===0).reduce((best,stage)=>Math.abs(stage.outerDoorOpen-.5)<Math.abs(best.outerDoorOpen-.5)?stage:best);
    const innerMid=samples.filter(stage=>stage.outerDoorOpen===1).reduce((best,stage)=>Math.abs(stage.innerDoorOpen-.5)<Math.abs(best.innerDoorOpen-.5)?stage:best);
    const stages=[{progress:.724,...journey.sample(.724,728/576)},outerMid,innerMid,{progress:1,...journey.sample(1,728/576)}];
    assert.equal(stages[0].outerDoorOpen,0); assert.equal(stages[0].innerDoorOpen,0);
    assert.ok(stages[1].outerDoorOpen>0&&stages[1].outerDoorOpen<1); assert.equal(stages[1].innerDoorOpen,0);
    assert.equal(stages[2].outerDoorOpen,1); assert.ok(stages[2].innerDoorOpen>0&&stages[2].innerDoorOpen<1);
    assert.equal(stages[3].outerDoorOpen,1); assert.equal(stages[3].innerDoorOpen,1);
    const hinges = {outer:[],inner:[]};
    model.group.traverse(item=>{for(const stage of ['outer','inner'])if(item.name.startsWith(stage+' center door '))hinges[stage].push(item);});
    assert.equal(hinges.outer.length,2); assert.equal(hinges.inner.length,2);
    for(const stage of stages) {
      model.setDoorProgress(stage.outerDoorOpen,stage.innerDoorOpen);
      for(const [name,progress]of[['outer',stage.outerDoorOpen],['inner',stage.innerDoorOpen]]) {
        assert.ok(hinges[name].every(hinge=>Math.abs(Math.abs(hinge.rotation.y)-progress*Math.PI*100/180)<1e-8));
      }
    }
    model.setDoorProgress(0,0);
    assert.ok([...hinges.outer,...hinges.inner].every(hinge=>hinge.rotation.y===0),'Door pairs do not close on reversal');
    const path=out+'/classroom-model-checks.json';
    await writeFile(path,JSON.stringify({metadata:model.group.userData,seatCushions:seats.length,seatBacks:backs,rows:rows.size,mainSeats:mainSeats.length,rearSeats:rearSeats.length,doorStages:stages.map(({progress,outerDoorOpen,innerDoorOpen})=>({progress,outerDoorOpen,innerDoorOpen}))},null,2));
    evidence.push(path);
    return {foyer:stages[0].progress,outer:outerMid.progress,inner:innerMid.progress,hall:1};
  } finally {model.dispose();}
}
async function compareRoomReentry(page, beforeName, afterName) {
  const images = await Promise.all([beforeName,afterName].map(async name=>(await readFile(out+'/'+name+'.png')).toString('base64')));
  return page.evaluate(async images=>{
    const decoded = await Promise.all(images.map(base64=>new Promise((resolve,reject)=>{
      const image=new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src='data:image/png;base64,'+base64;
    })));
    const width=decoded[0].width,height=decoded[0].height;
    if(decoded[1].width!==width||decoded[1].height!==height)throw new Error('Room reentry screenshot dimensions changed');
    const canvas=document.createElement('canvas'); canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');
    const pixels=decoded.map(image=>{context.clearRect(0,0,width,height);context.drawImage(image,0,0);return context.getImageData(0,0,width,height).data;});
    let totalRGB=0,flatRGB=0,flatPixels=0,flatMaximum=0;
    const above={3:0,5:0,10:0,20:0};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const index=(y*width+x)*4;
      const differences=[0,1,2].map(channel=>Math.abs(pixels[0][index+channel]-pixels[1][index+channel]));
      const maximum=Math.max(...differences),sum=differences.reduce((a,b)=>a+b,0);
      totalRGB+=sum; for(const threshold of [3,5,10,20])if(maximum>threshold)above[threshold]++;
      if(x<width*.15||x>width*.85||y<height*.15||y>height*.85)continue;
      let flat=true;
      // Both images must be smooth throughout a5×5 neighborhood. This excludes
      // geometry/antialias edges rather than tolerating a room-wide light shift.
      for(let image=0;image<2&&flat;image++)for(let channel=0;channel<3&&flat;channel++) {
        let minimum=255,maximum=0;
        for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++) {
          const value=pixels[image][(yy*width+xx)*4+channel]; minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);
        }
        if(maximum-minimum>6)flat=false;
      }
      if(flat){flatPixels++;flatRGB+=sum;flatMaximum=Math.max(flatMaximum,maximum);}
    }
    return {width,height,pixels:width*height,meanRGBDelta:totalRGB/(width*height*3),pixelsAbove:above,flatPixels,flatMeanRGBDelta:flatRGB/(flatPixels*3),flatMaxChannelDelta:flatMaximum};
  },images);
}
async function showMilestoneSection(page, dialog, title) {
  const reading=dialog.locator('.milestone-reading'),pageY=await page.evaluate(()=>scrollY);
  await dialog.getByRole('button',{name:title,exact:true}).click();
  await expect(reading.getByRole('heading',{name:title,exact:true,level:3})).toBeInViewport({ratio:1});
  let previous=-1,unchanged=0;
  await expect.poll(async()=>{const top=await reading.evaluate(element=>element.scrollTop);unchanged=top===previous?unchanged+1:0;previous=top;return unchanged;},{intervals:[80],timeout:5000}).toBeGreaterThanOrEqual(2);
  assert.equal(await page.evaluate(()=>scrollY),pageY,'Section navigation moved the background page');
  return reading;
}
async function verifyMilestoneDialogs(page) {
  const cases=[
    {id:'MS1',title:'Project Proposals & Team Formation',sections:5,checks:[/ButterFlyer/,/Statement of Work/,/Groups of 3–5 Students/]},
    {id:'MS2',title:'MLOps Infrastructure',sections:8,checks:[/End-to-End Containerized Pipeline/i,/Grading Rubric/,/Individual Q&A/]},
    {id:'MS3',title:'Integration and Deployment',sections:7,checks:[/Template Repository/,/at least one training run logged and reproducible/i,/one successful run is sufficient/i]},
    {id:'MS4',title:'Design & Development',sections:6,checks:[/coverage must be at least 50%/i,/Test Documentation/]},
    {id:'MS5',title:'Deployment & Final Project Delivery',sections:6,checks:[/at least 70%/i,/6-minute video/,/600–800 word Medium blog post/]},
  ];
  const inspected=[];
  for(const item of cases) {
    const trigger=page.locator('.milestone-trigger').filter({hasText:item.id});
    if(item.id==='MS1')await watchMotion(page,'.milestone-popup');
    await trigger.click();
    const dialog=page.getByRole('dialog',{name:item.title,exact:true});
    await expect(dialog).toBeVisible();
    await expect.poll(()=>page.locator('h1').evaluate(element=>!!element.closest('[aria-hidden="true"], [inert]'))).toBe(true);
    const reading=dialog.locator('.milestone-reading');
    await expect.poll(async()=>(await reading.innerText()).length).toBeGreaterThan(2000);
    await expect.poll(()=>dialog.evaluate(element=>getComputedStyle(element).opacity==='1'&&element.getAnimations().length===0)).toBe(true);
    await expect(dialog.locator('.milestone-contents button')).toHaveCount(item.sections);
    await expect(reading.locator('.milestone-instruction-section')).toHaveCount(item.sections);
    const text=await reading.innerText(); for(const pattern of item.checks)assert.match(text,pattern);
    const backdropBlur=await page.locator('.milestone-backdrop').evaluate(element=>parseFloat(getComputedStyle(element).backdropFilter.match(/blur\(([\d.]+)px\)/)?.[1]||'0'));
    assert.ok(backdropBlur>0,'The milestone reading window has no blurred backdrop');
    const layers=await page.evaluate(()=>Object.fromEntries([['popup','.milestone-popup'],['backdrop','.milestone-backdrop'],['launcher','.chat-launcher']].map(([name,selector])=>[name,document.querySelector(selector) ? Number(getComputedStyle(document.querySelector(selector)).zIndex) : 0])));
    assert.ok(layers.popup>layers.backdrop,'The milestone reading window must be above its backdrop');
    if (chatEnabled) assert.ok(layers.backdrop>layers.launcher,'The chat launcher appears above the milestone backdrop');
    if(item.id==='MS1') {
      assert.doesNotMatch(text,/Staff feedback:\s*TBD/i);
      await motionEnded(page,'transform'); const opening=await motionEvidence(page,'milestone-modal-opening');
      assert.ok(opening.samples.some(sample=>sample.opacity>0&&sample.opacity<1),'Milestone modal did not animate into view');
      const sample=reading.getByRole('img',{name:'Butterfly example',exact:true}); await sample.scrollIntoViewIfNeeded();
      await expect.poll(()=>sample.evaluate(element=>element.complete&&element.naturalWidth>0)).toBe(true);
    }
    if(item.id==='MS2') {
      await screenshot(page,'ms2-modal-desktop');
      const pageY=await page.evaluate(()=>scrollY);
      await showMilestoneSection(page,dialog,'Grading Rubric');
      await expect.poll(()=>reading.evaluate(element=>element.scrollTop)).toBeGreaterThan(100);
      await expect(reading.locator('table')).toBeVisible();
      await expect(reading.locator('table').getByRole('row').first()).toBeInViewport({ratio:1});
      await expect(reading.locator('table')).toContainText('What we assess');
      await expect(reading.locator('table').getByRole('row').last()).toContainText(/Total[\s\S]*10/);
      assert.equal(await page.evaluate(()=>scrollY),pageY,'Section navigation moved the background page');
      await screenshot(page,'ms2-rubric-desktop');
    }
    await dialog.getByRole('button',{name:'Close milestone instructions',exact:true}).focus();
    for(let index=0;index<item.sections+8;index++) {
      await page.keyboard.press(index%4===0?'Shift+Tab':'Tab');
      await expect.poll(()=>dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
    }
    await dialog.getByRole('button',{name:'Close milestone instructions',exact:true}).click();
    await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(dialog).toBeVisible();
    await expect.poll(()=>dialog.evaluate(element=>getComputedStyle(element).opacity==='1'&&element.getAnimations().length===0)).toBe(true);
    if(item.id==='MS1')await watchMotion(page,'.milestone-popup');
    await page.keyboard.press('Escape');
    if(item.id==='MS1') {
      // BaseUI can remove the portal before the browser dispatches transitionend.
      // Observe the actual fade frames and physical unmount instead.
      await expect(page.locator('.milestone-popup')).toHaveCount(0);
      const closing=await motionEvidence(page,'milestone-modal-closing');
      assert.ok(closing.samples.some(sample=>sample.opacity>0&&sample.opacity<1),'Milestone modal did not animate out');
    }
    await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    inspected.push({id:item.id,title:item.title,sections:item.sections,characters:text.length,closeAndEscape:true,focusContained:true});
  }
  const path=out+'/milestone-dialogs.json';await writeFile(path,JSON.stringify(inspected,null,2));evidence.push(path);return inspected;
}

const imageHash = image => createHash('sha256').update(image).digest('hex');
async function assertTheme(page, preference, resolved) {
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', preference);
  await expect(page.locator('html')).toHaveAttribute('data-theme', resolved);
  await expect(page.getByRole('button', { name: `Use ${preference} theme`, exact: true })).toHaveAttribute('aria-pressed', 'true');
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.locator('.scene-canvas canvas').waitFor();
  assert.match(await page.title(), /AC215/);
  assert.equal(await page.getByRole('heading', { name: 'AI, beyond the notebook.' }).count(), 0);
  await expect(page.getByRole('figure', { name: /Architectural model/ })).toBeVisible();
  await assertTheme(page, 'system', 'light');
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.getByRole('button', { name: 'Use light theme', exact: true }).focus();
  await page.keyboard.press('Space');
  await assertTheme(page, 'light', 'light');
  const lightBackground = await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor);
  await screenshot(page, 'theme-light');
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();
  await assertTheme(page, 'dark', 'dark');
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(lightBackground);
  await page.emulateMedia({ colorScheme: 'light' });
  await assertTheme(page, 'dark', 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('ac215-theme')), 'dark');
  await page.reload();
  await assertTheme(page, 'dark', 'dark');
  await page.locator('.scene-canvas canvas').waitFor();
  await screenshot(page, 'theme-dark');
  const darkBackground = await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Use system theme', exact: true }).click();
  await assertTheme(page, 'system', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await assertTheme(page, 'system', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await assertTheme(page, 'system', 'light');
  await page.reload();
  await assertTheme(page, 'system', 'light');
  await page.locator('.scene-canvas canvas').waitFor();
  record('Keyboard-accessible Light/Dark/System controls; saved selection survives reload; System follows OS changes and explicit Dark remains dark');
  await screenshot(page, 'desktop');
  record('Desktop course identity, fonts and reference-based architectural WebGL scene');
  const canvas = page.locator('.scene-canvas canvas');
  const before = imageHash(await canvas.screenshot());
  await page.getByRole('link', { name: 'Explore the course', exact: true }).click();
  assert.equal(await page.locator('#curriculum').evaluate(element=>element.tagName),'H2');
  await expect.poll(() => page.locator('#curriculum').evaluate(element => Math.abs(element.getBoundingClientRect().top-128))).toBeLessThan(2);
  await expect.poll(async () => imageHash(await canvas.screenshot())).not.toBe(before);
  await screenshot(page, 'scroll-chapter');
  await page.getByRole('button', { name: 'Pause scene movement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume scene movement', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const held = imageHash(await canvas.screenshot());
  const scrollBeforePause = await page.evaluate(() => scrollY);
  await page.evaluate(() => scrollBy({ top: 250, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBeforePause + 200);
  // Give multiple render frames a chance to move: Pause must hold the camera while the page scrolls.
  await page.waitForTimeout(200);
  assert.equal(imageHash(await canvas.screenshot()), held, 'Paused camera changed after scrolling');
  await page.waitForTimeout(150);
  assert.equal(imageHash(await canvas.screenshot()), held, 'Paused scene did not stay still');
  await screenshot(page, 'scene-paused');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await expect.poll(() => page.evaluate(()=>scrollY)).toBe(0);
  // The transparent WebGL canvas needs a fixed backdrop here, so a body-color
  // fade alone cannot make the 3D interpolation checks pass.
  await page.locator('.scene-frame').evaluate(element=>{element.style.backgroundColor='rgb(128, 128, 128)';});
  const lightScene = await stableScene(canvas);
  const darkScene = await gradualTheme(page,canvas,'dark',lightBackground,darkBackground,lightScene);
  const settledLightScene = await gradualTheme(page,canvas,'light',darkBackground,lightBackground,darkScene);
  await watchTheme(page);
  await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
  await expect.poll(() => page.evaluate(({lightBackground,darkBackground})=>window.__qaTheme.samples.some(item=>item.color!==lightBackground&&item.color!==darkBackground),{lightBackground,darkBackground})).toBe(true);
  const reversingColor = await page.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor);
  assert.notEqual(reversingColor,darkBackground,'Dark finished before the rapid reversal was triggered');
  await page.getByRole('button',{name:'Use light theme',exact:true}).click();
  await assertTheme(page,'light','light');
  await saveScene(canvas,'scene-reversal-point');
  await expect.poll(()=>page.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe(lightBackground);
  assert.equal(await stableScene(canvas),settledLightScene,'Rapid reversal did not settle at the latest scene theme');
  await saveScene(canvas,'scene-reversal-settled');
  const reversal = await themeEvidence(page,'theme-reversal');
  assert.ok(reversal.samples.some(item=>item.target==='dark'&&item.color!==lightBackground&&item.color!==darkBackground));
  await page.getByRole('button',{name:'Use system theme',exact:true}).click();
  await assertTheme(page,'system','light');
  await page.locator('.scene-frame').evaluate(element=>element.style.removeProperty('background-color'));
  await expect(page.getByRole('button',{name:'Resume scene movement',exact:true})).toBeVisible();
  record('Paused-camera Light/Dark transitions show intermediate colors and scene frames; rapid reversal settles at the latest theme');
  await page.getByRole('button', { name: 'Resume scene movement', exact: true }).click();
  await expect.poll(async () => imageHash(await canvas.screenshot())).not.toBe(held);
  record('Running scene changes perspective with scroll; Pause freezes the camera through scrolling and Resume updates it');
  const classroomStops=await verifyClassroomModel(page);
  record('Source model has 240 main and 60 raised rear seats, curved rows and a clear center spine, plus sequential animated center door pairs');
  const journeyEvidence = [];
  await scrollJourney(page,.60);
  await expect.poll(async()=>{const state=await journeyState(page);return {filter:state.filter,opacity:state.opacity};}).toEqual({filter:'none',opacity:1});
  const exterior = await captureJourney(page,'journey-exterior-light'); journeyEvidence.push(exterior);
  await scrollJourney(page,.65);
  await expect.poll(async()=>parseFloat((await journeyState(page)).filter.match(/blur\(([\d.]+)px\)/)?.[1]||'0')).toBeGreaterThan(5);
  const defocused = await captureJourney(page,'journey-wall-defocus'); journeyEvidence.push(defocused);
  assert.ok(defocused.opacity>0&&defocused.opacity<1);
  await scrollJourney(page,.67);
  await expect.poll(async()=>(await journeyState(page)).opacity).toBeLessThan(.01);
  const concealed = await captureJourney(page,'journey-wall-concealed'); journeyEvidence.push(concealed);
  assert.ok(parseFloat(concealed.filter.match(/blur\(([\d.]+)px\)/)?.[1]||'0')>=17);
  await scrollJourney(page,.724); await expectClearHall(page);
  const foyer = await captureJourney(page,'journey-foyer-light'); journeyEvidence.push(foyer);
  assert.notEqual(foyer.hash,exterior.hash);
  await scrollJourney(page,classroomStops.outer); await expectClearHall(page);
  const outerOpening = await captureJourney(page,'journey-outer-opening-light'); journeyEvidence.push(outerOpening);
  await scrollJourney(page,classroomStops.inner); await expectClearHall(page);
  const innerOpening = await captureJourney(page,'journey-inner-opening-light'); journeyEvidence.push(innerOpening);
  assert.notEqual(outerOpening.hash,foyer.hash); assert.notEqual(innerOpening.hash,outerOpening.hash);
  await scrollJourney(page,classroomStops.outer); await expectClearHall(page);
  const outerReversed = await captureJourney(page,'journey-outer-reversed'); journeyEvidence.push(outerReversed);
  assert.equal(outerReversed.hash,outerOpening.hash,'Reversing to the first door opening did not restore its view');
  await scrollJourney(page,.724); await expectClearHall(page);
  const foyerReversed = await captureJourney(page,'journey-foyer-reversed'); journeyEvidence.push(foyerReversed);
  assert.equal(foyerReversed.hash,foyer.hash,'The door pairs did not restore their closed foyer view on reversal');
  await scrollJourney(page,.65);
  await expect.poll(async()=>parseFloat((await journeyState(page)).filter.match(/blur\(([\d.]+)px\)/)?.[1]||'0')).toBeGreaterThan(5);
  const wallReversed = await captureJourney(page,'journey-wall-reversed'); journeyEvidence.push(wallReversed);
  assert.equal(wallReversed.hash,defocused.hash,'Wall defocus did not restore its earlier view on reversal');
  await scrollJourney(page,classroomStops.inner); await expectClearHall(page);
  await page.getByRole('button',{name:'Pause scene movement',exact:true}).click();
  const heldDoorStage = await stableScene(canvas);
  await scrollJourney(page,1);
  await expect.poll(()=>page.locator('#classroom').evaluate(element=>Math.abs(element.getBoundingClientRect().top-128))).toBeLessThan(2);
  assert.equal(await stableScene(canvas),heldDoorStage,'Pause failed to hold the camera and door-opening stage');
  await page.getByRole('button',{name:'Resume scene movement',exact:true}).click();
  await expectClearHall(page);
  await expect.poll(async()=>imageHash(await canvas.screenshot())).not.toBe(heldDoorStage);
  const arrival = await captureJourney(page,'journey-hall-light'); journeyEvidence.push(arrival);
  assert.ok(arrival.box.y>=0&&arrival.box.y+arrival.box.height<=900,'Hall canvas is clipped by the arrival viewport');
  assert.ok(Math.abs(arrival.headingTop-128)<2);
  assert.equal(await page.locator('.scene-canvas-failed').count(),0);
  await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
  await assertTheme(page,'dark','dark');
  await expect.poll(()=>page.locator('body').evaluate(element=>element.getAnimations().length)).toBe(0);
  for(const [name,progress]of[['foyer',classroomStops.foyer],['outer-opening',classroomStops.outer],['inner-opening',classroomStops.inner],['hall',1]]) {
    await scrollJourney(page,progress); await expectClearHall(page);
    journeyEvidence.push(await captureJourney(page,'journey-'+name+'-dark'));
  }
  assert.notEqual(journeyEvidence.at(-1).hash,arrival.hash,'Hall day and night views did not change');
  await page.getByRole('button',{name:'Use system theme',exact:true}).click();
  await assertTheme(page,'system','light');
  await expect.poll(()=>page.locator('body').evaluate(element=>element.getAnimations().length)).toBe(0);
  await writeFile(out+'/journey-stages.json',JSON.stringify(journeyEvidence,null,2)); evidence.push(out+'/journey-stages.json');
  record('The wall defocus and sequential door approach reverse correctly; Pause holds their stage; arrival is fully visible beside the aligned classroom heading');
  assert.equal(await page.locator('a[href*="harvard-iacs"]').count(), 0);
  const courseResources=page.getByRole('navigation',{name:'Course resources',exact:true});
  assert.equal(await courseResources.getByRole('link', {name:'Discussion on Ed',exact:true}).getAttribute('href'), 'https://edstem.org/us/courses/97373/discussion');
  assert.equal(await courseResources.getByRole('link', {name:'Lectures on Ed',exact:true}).getAttribute('href'), 'https://edstem.org/us/courses/97373/lessons');
  await page.getByRole('link', {name:'See the project milestones',exact:true}).click();
  await page.waitForURL(url => url.pathname === '/milestones.html');
  await verifyMilestoneDialogs(page);
  await page.goto(base);
  record('All five milestone windows show full instructions, trap and return focus, close by button and Escape, and navigate within the reading area');

  if (chatEnabled) {
  await watchMotion(page,'.course-chat');
  await openChat(page);
  await motionEnded(page,'clip-path');
  const chatOpening = await motionEvidence(page,'chat-opening');
  assert.ok(new Set(chatOpening.samples.map(item => item.clipPath)).size > 2, 'Chat did not morph through intermediate shapes');
  assert.notEqual(await page.getByRole('dialog').getAttribute('aria-modal'), 'true');
  await expect(page.getByLabel('Your course question')).toBeFocused();
  await expect(page.locator('.chat-header button')).toHaveCount(2);
  await expect(page.locator('.chat-header p')).toHaveCount(0);
  const accessibleTitle = await page.getByRole('heading',{name:'Ask AC215',exact:true}).boundingBox();
  assert.ok(accessibleTitle.width<=1&&accessibleTitle.height<=1,'Chat title should be available to assistive technology without a visible heading');
  const inputGroup = page.locator('[data-slot="input-group"]');
  await expect(inputGroup.getByRole('button',{name:'Send question',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Clear conversation',exact:true}).focus();
  const restingComposer = await inputGroup.evaluate(element=>{const css=getComputedStyle(element);return {border:css.borderTopWidth,color:css.borderTopColor,outline:css.outlineStyle,shadow:css.boxShadow};});
  await page.getByLabel('Your course question').focus();
  const focusedComposer = await inputGroup.evaluate(element=>{const css=getComputedStyle(element);return {border:css.borderTopWidth,color:css.borderTopColor,outline:css.outlineStyle,shadow:css.boxShadow};});
  const textareaStyle = await page.getByLabel('Your course question').evaluate(element=>{const css=getComputedStyle(element);return {border:css.borderTopWidth,outline:css.outlineWidth,shadow:css.boxShadow};});
  assert.deepEqual(focusedComposer,restingComposer,'Focus added an extra border or ring to the composer');
  assert.equal(focusedComposer.border,'1px');
  assert.equal(focusedComposer.outline,'none');
  assert.equal(focusedComposer.shadow,'none');
  assert.deepEqual(textareaStyle,{border:'0px',outline:'0px',shadow:'none'});
  assert.equal(await page.locator('.chat-composer').evaluate(element=>getComputedStyle(element).borderTopWidth),'0px');
  await writeFile(out+'/composer-style.json',JSON.stringify({restingComposer,focusedComposer,textareaStyle},null,2));
  evidence.push(out+'/composer-style.json');
  record('Compact chat header has only two controls; Send stays inside the highlighted input with one permanent border and no added focus ring');
  await page.getByLabel('Your course question').fill('Draft kept while minimized');
  await watchMotion(page,'.course-chat');
  await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
  await motionEnded(page,'clip-path');
  await motionEvidence(page,'chat-closing');
  await expect(page.getByRole('dialog')).toBeHidden();
  await openChat(page);
  await expect(page.getByLabel('Your course question')).toHaveValue('Draft kept while minimized');
  await page.getByLabel('Your course question').fill('Where does the class meet?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.guide-answer').last()).toContainText('SEC 1.321', {timeout:15000});
  await expect(page.locator('.guide-mode-note')).toHaveText('Notes preview. Source excerpts, without a model.');
  const realTurn = page.locator('.chat-turn').last();
  await expect(realTurn.locator('.work-group > .disclosure-trigger')).toHaveAttribute('aria-expanded','false');
  assert.ok(await realTurn.locator('.tool-read').count() > 0);
  await realTurn.locator('.work-group > .disclosure-trigger').click();
  const read = realTurn.locator('.tool-read').first();
  await read.locator(':scope > .disclosure-trigger').click();
  await expect(read.locator('.tool-values')).toBeVisible();
  assert.match(await read.locator('.tool-values').innerText(), /Input[\s\S]+(general|lectures|milestones|project)\.md[\s\S]+Result[\s\S]+SEC 1\.321/);
  await expect(page.locator('.guide-sources')).toHaveCount(0);
  await expect(page.getByText('Temporary chat. Nothing is saved.', {exact:true})).toHaveCount(0);
  const readFilename = await read.locator('.tool-values dd').first().innerText();
  assert.match(readFilename, /^(general|lectures|milestones|project)\.md$/);
  const fileResponse = await context.request.get(base + '/api/course/files/' + readFilename);
  assert.equal(fileResponse.status(),200); assert.match(await fileResponse.text(),/SEC 1\.321/);
  await screenshot(page,'course-guide');
  await page.getByLabel('Your course question').fill('Another retained draft');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await openChat(page);
  await expect(page.getByLabel('Your course question')).toHaveValue('Another retained draft');
  await expect(page.locator('.chat-turn')).toHaveCount(1);
  record('Real local notes preview reads allowlisted files; tool input/output is inspectable; non-modal chat retains drafts and turns while minimized');

  await clearChat(page);
  await page.route('**/api/chat/stream', route => route.continue({url:fixtureURL}));
  exchange = null; await sendQuestion(page,'Controlled status and disclosure timing');
  await expect.poll(() => Boolean(exchange)).toBe(true);
  emit({type:'read_start',...step});
  const work = page.locator('.work-group');
  await expect(work.locator(':scope > .disclosure-trigger')).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('button',{name:'Stop response',exact:true})).toBeVisible();
  await expect(page.locator('[data-slot="input-group"]').getByRole('button',{name:'Stop response',exact:true})).toHaveCount(1);
  emit({type:'read_complete',...step,input:{filename:step.filename},output:'# Course notes\nSEC 1.321',characters:26});
  const tool = page.locator('.tool-read');
  await tool.locator(':scope > .disclosure-trigger').click();
  await expect(tool.locator('.tool-values')).toContainText('SEC 1.321');
  const compactRows = {
    work: (await work.locator(':scope > .disclosure-trigger').boundingBox()).height,
    tool: (await tool.locator(':scope > .disclosure-trigger').boundingBox()).height,
  };
  assert.ok(compactRows.work >= 24 && compactRows.work <= 33, 'Work bar is not compact or has a target below 24px');
  assert.ok(compactRows.tool >= 24 && compactRows.tool <= 31, 'Tool row is not compact or has a target below 24px');
  await writeFile(out + '/compact-rows.json', JSON.stringify(compactRows, null, 2));
  evidence.push(out + '/compact-rows.json');
  await screenshot(page,'working-tool-inspection');
  await watchMotion(page,'.chat-turn:last-child .work-group > .disclosure-panel');
  await work.locator(':scope > .disclosure-trigger').click();
  await expect.poll(() => page.evaluate(() => window.__qaMotion.samples.some(item => item.expanded === 'false' && item.height > 1))).toBe(true);
  await work.locator(':scope > .disclosure-trigger').click();
  await expect(work.locator(':scope > .disclosure-trigger')).toHaveAttribute('aria-expanded','true');
  await motionEnded(page,'grid-template-rows'); await motionEvidence(page,'work-reversal');
  await expect(tool.locator(':scope > .disclosure-trigger')).toHaveAttribute('aria-expanded','true');
  await tool.locator(':scope > .disclosure-trigger').click();
  await expect(work.locator(':scope > .disclosure-trigger')).toHaveAttribute('aria-expanded','true');
  await tool.locator(':scope > .disclosure-trigger').click();
  await expect(tool.locator('.tool-values')).toBeVisible();
  await expect.poll(() => tool.locator('.disclosure-panel').evaluate(element => element.getAnimations().length)).toBe(0);
  await watchMotion(page,'.chat-turn:last-child .work-group > .disclosure-panel');
  emit(answer); exchange.end(); await motionEnded(page,'grid-template-rows');
  await expect(page.locator('.guide-answer')).toHaveText('Controlled preview answer.');
  const collapse = await motionEvidence(page,'work-before-answer');
  const closingFrames = collapse.samples.filter(item => item.expanded === 'false' && item.height > 1);
  assert.ok(closingFrames.length > 0,'No intermediate outer collapse was observed');
  assert.ok(closingFrames.every(item => !item.answer),'Answer appeared before work finished collapsing');
  assert.equal(collapse.ends.find(item=>item.property==='grid-template-rows').answer,false);
  await screenshot(page,'tool-inspection'); await page.unroute('**/api/chat/stream');
  record('Controlled SSE exposes working reads; nested disclosures remain independent, reverse while moving, and the answer waits for actual collapse completion');

  await clearChat(page); await sendQuestion(page,'What is the weather in Boston?');
  await expect(page.locator('.guide-answer')).toContainText('couldn’t find', {timeout:15000});
  await expect(page.locator('.guide-sources a')).toHaveCount(0); await clearChat(page);
  await page.route('**/api/chat/stream',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Unavailable"}'}));
  await sendQuestion(page,'What are the prerequisites?');
  await expect(page.getByRole('alert')).toContainText('could not connect'); await screenshot(page,'error-state');
  await page.unroute('**/api/chat/stream'); await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.guide-answer')).toContainText(/Python|prerequisite/i,{timeout:15000}); await clearChat(page);
  await page.route('**/api/chat/stream',route=>route.fulfill({status:200,contentType:'text/event-stream',body:'data: {"type":"started","mode":"sources"}\n\ndata: {"type":"error","message":"Controlled stream failure"}\n\n'}));
  await sendQuestion(page,'Test a stream error'); await expect(page.getByRole('alert')).toContainText('Controlled stream failure');
  await page.unroute('**/api/chat/stream'); await clearChat(page);
  await page.route('**/api/chat/stream',route=>route.continue({url:fixtureURL})); exchange = null;
  await sendQuestion(page,'Hold this response until Stop'); await expect.poll(() => Boolean(exchange)).toBe(true);
  emit({type:'read_start',...step}); await expect(page.locator('.tool-read')).toHaveCount(1);
  await page.getByRole('button',{name:'Stop response',exact:true}).click();
  await expect(page.getByText('Response stopped. You can ask again.',{exact:true})).toBeVisible();
  emit({...answer,answer:'Late answer must never return'}); exchange.end(); await page.unroute('**/api/chat/stream');
  await sendQuestion(page,'Where does the class meet?');
  await expect(page.locator('.guide-answer')).toContainText('SEC 1.321',{timeout:15000});
  assert.equal(await page.getByText('Late answer must never return',{exact:true}).count(),0);
  await expect(page.locator('.chat-stopped')).toBeVisible();
  record('Unknown questions are honest; HTTP error retries against the real service; SSE errors display; Stop blocks late answers and permits a new question');

  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))),{'ac215-theme':'system'});
  assert.equal(await page.evaluate(() => sessionStorage.length),0); assert.deepEqual(await context.cookies(),[]);
  await page.reload(); await openChat(page); await expect(page.locator('.chat-turn')).toHaveCount(0);
  await expect(page.getByLabel('Your course question')).toHaveValue('');
  await page.getByLabel('Your course question').fill('A draft that Clear removes'); await clearChat(page);
  await expect(page.getByLabel('Your course question')).toHaveValue(''); await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Send question',exact:true})).toBeFocused(); await page.keyboard.press('Escape');
  record('Only theme is saved; reload and Clear erase chat; keyboard supports Enter, Tab and Escape');
  } else {
    await expect(page.locator('.chat-launcher, .course-chat, .ask-section')).toHaveCount(0);
    record('Default course build has no chat launcher, dialog or starter prompts');
  }

  const navigationPositions = [];
  const classroomPosters = [];
  for (const width of [320,390,768,1280,1920]) {
    await page.setViewportSize({width,height:width<800?844:900}); await page.goto(base);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);
    if(width<800) {
      const menu=page.locator('.mobile-navigation');
      await menu.locator('summary').click(); await expect(menu).toHaveAttribute('open','');
      await menu.getByRole('link',{name:'Schedule',exact:true}).click();
      await page.waitForURL(url=>url.pathname==='/schedule.html');
      await expect(page.getByRole('heading',{level:1,name:'Schedule.',exact:true})).toBeVisible();
      const homeNav = width < 1181 ? page.locator('.mobile-navigation') : page.locator('.nav-links');
      if (width < 1181) await homeNav.locator('summary').click();
      await homeNav.getByRole('link', { name: 'Home', exact: true }).click();
      await page.waitForURL(url=>url.pathname==='/'); await page.locator('.scene-canvas canvas').waitFor();
    }
    if (width === 390) {
      const portrait = page.locator('.person-lead').filter({hasText:'Pavlos Protopapas'}).locator('img');
      assert.equal(await portrait.getAttribute('src'),'/staff/pavlos-protopapas.png');
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(()=>portrait.evaluate(element=>element.complete&&element.naturalWidth>0)).toBe(true);
      const response=await context.request.get(base+'/staff/pavlos-protopapas.png');
      assert.equal(response.status(),200); assert.match(response.headers()['content-type'],/^image\/png/);
      const path=out+'/pavlos-portrait.json';
      await writeFile(path,JSON.stringify(await portrait.evaluate(element=>({src:element.getAttribute('src'),width:element.naturalWidth,height:element.naturalHeight})),null,2)); evidence.push(path);
    }
    if (width === 390 || width === 1280) {
      const expectedTop = width === 390 ? 64 + 24 : 88 + 40;
      for (const [label,id] of [['Explore the course','curriculum'],['Teaching staff','people']]) {
        await page.getByRole('link',{name:label,exact:true}).click();
        const heading = page.locator('#'+id);
        assert.equal(await heading.evaluate(element=>element.tagName),'H2',`${id} fragment does not target the actual heading`);
        await expect.poll(()=>heading.evaluate((element,expected)=>Math.abs(element.getBoundingClientRect().top-expected),expectedTop),{timeout:10000}).toBeLessThan(2);
        navigationPositions.push({width,id,expectedTop,actualTop:await heading.evaluate(element=>element.getBoundingClientRect().top)});
      }
      const homeNav = width < 1181 ? page.locator('.mobile-navigation') : page.locator('.nav-links');
      if (width < 1181) await homeNav.locator('summary').click();
      await homeNav.getByRole('link', { name: 'Home', exact: true }).click();
      await page.waitForURL(url=>url.pathname==='/'); await page.locator('.scene-canvas canvas').waitFor();
      await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
      navigationPositions.push({width,id:'top',actualTop:await page.evaluate(()=>scrollY)});
      await screenshot(page,'navigation-home-'+width);
    }
    if (width === 390) {
      const poster = page.locator('.classroom-still');
      for(const mode of ['light','dark']) {
        await page.getByRole('button',{name:`Use ${mode} theme`,exact:true}).click();
        await poster.scrollIntoViewIfNeeded(); await expect(poster).toBeVisible();
        const image = page.locator('.classroom-still-'+mode);
        await expect.poll(()=>image.evaluate(element=>element.complete&&element.naturalWidth>0)).toBe(true);
        await expect.poll(()=>image.evaluate(element=>getComputedStyle(element).opacity)).toBe('1');
        classroomPosters.push({mode,viewport:width,...await image.evaluate(element=>({src:element.getAttribute('src'),width:element.naturalWidth,height:element.naturalHeight}))});
        await screenshot(page,'classroom-mobile-'+mode);
      }
      await page.getByRole('button',{name:'Use system theme',exact:true}).click();
      await assertTheme(page,'system','light');
    }
    if (chatEnabled) {
      await openChat(page); const rect=await page.locator('.course-chat').boundingBox();
      assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=(width<800?844:900)+1,`Chat outside ${width}px viewport`);
    } else await expect(page.locator('.chat-launcher, .course-chat')).toHaveCount(0);
    await screenshot(page,'viewport-'+width);
  }
  record('No overflow at 320/390/768/1280/1920; mobile menu and enabled chat fit each viewport');
  await writeFile(out+'/navigation-positions.json',JSON.stringify(navigationPositions,null,2));
  evidence.push(out+'/navigation-positions.json');
  record('Desktop and mobile navigation aligns each actual section heading below the sticky header; Home returns to scroll position zero');
  await context.close();
  const reducedDesktopContext = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',colorScheme:'light'});
  const reducedDesktop = await reducedDesktopContext.newPage();
  page=reducedDesktop;
  reducedDesktop.on('pageerror',error=>errors.push(error.message));
  await reducedDesktop.goto(base); await reducedDesktop.locator('.scene-canvas canvas').waitFor();
  await scrollJourney(reducedDesktop,1); await expectClearHall(reducedDesktop);
  const reducedArrival = await captureJourney(reducedDesktop,'classroom-reduced-endpoint');
  await expect(reducedDesktop.getByRole('button',{name:'Pause scene movement',exact:true})).toBeHidden();
  await scrollJourney(reducedDesktop,.9); await expectClearHall(reducedDesktop);
  assert.equal(await stableScene(reducedDesktop.locator('.scene-canvas canvas')),reducedArrival.hash,'Reduced motion moved within the stationary hall endpoint');
  await scrollJourney(reducedDesktop,.5);
  await expect.poll(async()=>{const state=await journeyState(reducedDesktop);return {filter:state.filter,opacity:state.opacity};}).toEqual({filter:'none',opacity:1});
  const reducedExterior = await captureJourney(reducedDesktop,'classroom-reduced-exterior');
  assert.notEqual(reducedExterior.hash,reducedArrival.hash);
  await scrollJourney(reducedDesktop,.67);
  assert.equal(await stableScene(reducedDesktop.locator('.scene-canvas canvas')),reducedExterior.hash,'Reduced motion animated the hidden wall-passage interval');
  await scrollJourney(reducedDesktop,1); await expectClearHall(reducedDesktop);
  const reducedReturned = await captureJourney(reducedDesktop,'classroom-reduced-returned');
  await writeFile(out+'/classroom-reduced-states.json',JSON.stringify({arrival:reducedArrival,exterior:reducedExterior,returned:reducedReturned},null,2)); evidence.push(out+'/classroom-reduced-states.json');
  assert.deepEqual(reducedReturned.box,reducedArrival.box);
  assert.equal(reducedReturned.headingTop,reducedArrival.headingTop);
  // Fractional CSS bounds and WebGL compositor edges can change on mode reentry.
  // Only this reentry comparison has a tight visual tolerance; all stationary
  // frame checks remain byte-exact, including the restored endpoint below.
  const reentry=await compareRoomReentry(reducedDesktop,reducedArrival.name,reducedReturned.name);
  assert.ok(reentry.meanRGBDelta<=1.25,'Room reentry changed the overall appearance');
  assert.ok(reentry.flatPixels>1000,'No flat room interior was available for comparison');
  assert.ok(reentry.flatMeanRGBDelta<=.5,'Room reentry changed flat interior lighting');
  assert.ok(reentry.flatMaxChannelDelta<=8,'Room reentry changed a flat interior color');
  await writeFile(out+'/classroom-reduced-reentry-comparison.json',JSON.stringify(reentry,null,2)); evidence.push(out+'/classroom-reduced-reentry-comparison.json');
  await scrollJourney(reducedDesktop,.9); await expectClearHall(reducedDesktop);
  assert.equal(await stableScene(reducedDesktop.locator('.scene-canvas canvas')),reducedReturned.hash,'The restored reduced-motion endpoint did not remain stationary');
  await reducedDesktopContext.close();
  record('Reduced motion uses stationary exterior and hall endpoints, bypasses the wall-flight interval and restores the same room view');
  const still=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const reduced=await still.newPage();await reduced.goto(base);
  page=reduced;
  reduced.on('pageerror',error=>errors.push(error.message));
  const reducedCanvas = reduced.locator('.scene-canvas canvas');
  await reducedCanvas.waitFor();
  await reduced.locator('.scene-frame').evaluate(element=>{element.style.backgroundColor='rgb(128, 128, 128)';});
  const reducedLightScene = await stableScene(reducedCanvas);
  await reduced.getByRole('button',{name:'Use dark theme',exact:true}).click();
  await assertTheme(reduced,'dark','dark');
  assert.equal(await reduced.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor),darkBackground);
  assert.equal(await reduced.locator('body').evaluate(element=>element.getAnimations().length),0);
  assert.equal(await reduced.locator('body').evaluate(element=>getComputedStyle(element).transitionProperty),'none');
  assert.equal(await reduced.locator('html').evaluate(element=>parseFloat(getComputedStyle(element).getPropertyValue('--dur-theme'))),0);
  const reducedDarkScene = await saveScene(reducedCanvas,'reduced-theme-dark');
  assert.notEqual(reducedDarkScene,reducedLightScene);
  assert.equal(await stableScene(reducedCanvas),reducedDarkScene,'Reduced-motion dark scene continued to animate after the theme changed');
  await reduced.getByRole('button',{name:'Use light theme',exact:true}).click();
  await assertTheme(reduced,'light','light');
  assert.equal(await reduced.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor),lightBackground);
  const reducedRestoredScene = await saveScene(reducedCanvas,'reduced-theme-light');
  assert.equal(reducedRestoredScene,reducedLightScene,'Reduced-motion light scene did not immediately return to its original appearance');
  assert.equal(await stableScene(reducedCanvas),reducedRestoredScene);
  await reduced.locator('.scene-frame').evaluate(element=>element.style.removeProperty('background-color'));
  await expect(reduced.getByRole('button',{name:'Pause scene movement',exact:true})).toBeHidden();
  if (chatEnabled) {
    await openChat(reduced);
    assert.equal(await reduced.locator('.course-chat').evaluate(element=>getComputedStyle(element).transitionDuration),'0s');
    await sendQuestion(reduced,'Where does the class meet?'); await expect(reduced.locator('.guide-answer')).toContainText('SEC 1.321',{timeout:15000});
  } else await expect(reduced.locator('.chat-launcher, .course-chat')).toHaveCount(0);
  await screenshot(reduced,'reduced-motion');await still.close();
  await writeFile(out+'/classroom-posters.json',JSON.stringify(classroomPosters,null,2)); evidence.push(out+'/classroom-posters.json');
  record('The classroom has loaded mobile day/night posters; reduced motion uses still scene endpoints');
  assert.deepEqual(errors,[]);
  await writeFile(out+'/results.json',JSON.stringify({completedAt:new Date().toISOString(),passed:results,errors,evidence},null,2));

} catch(error) {
  if (page && !page.isClosed()) await themeEvidence(page,'failed-theme').catch(() => {});
  if (page && !page.isClosed()) await motionEvidence(page,'failed-motion').catch(() => {});
  if (page && !page.isClosed()) await screenshot(page,'failure').catch(() => {});
  await writeFile(out+'/failed-results.json',JSON.stringify({completedAt:new Date().toISOString(),passed:results,errors,error:String(error),evidence},null,2)); throw error;
} finally { if (fixture.listening) { fixture.closeAllConnections(); await new Promise(resolve=>fixture.close(resolve)); } await browser.close(); }

/** Exercise-detail acceptance against the actual local LAB app. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';

const evidence = resolve(process.env.ANATOMY_EVIDENCE_DIR ?? join(tmpdir(), 'dc-anatomy-evidence', 'exercise-animation'));
await mkdir(evidence, {recursive:true});
let server;
let origin = process.env.ANATOMY_TEST_ORIGIN;
if (origin && !['127.0.0.1','localhost'].includes(new URL(origin).hostname)) throw new Error('A loopback app URL is required for this check.');
if (!origin) {
  const fixture = await mkdtemp(join(tmpdir(), 'dc-anatomy-detail-'));
  const config = join(fixture, 'wrangler.json');
  await writeFile(config, JSON.stringify({
    name:'doctorcoach-anatomy-local-tests',
    compatibility_date:'2026-10-14',
    d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:resolve('drizzle')}],
  }));
  const migrated = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to',resolve('.wrangler/state')], {
    encoding:'utf8',
    timeout:120000,
    env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'},
  });
  assert.equal(migrated.status, 0, 'Local migrations failed: '+migrated.stdout+migrated.stderr+migrated.error);
  server = await createServer({server:{host:'127.0.0.1',port:0,hmr:false}});
  await server.listen();
  [origin] = server.resolvedUrls.local;
}
const checks = [];
const errors = [];
let browser;
try {
  browser = await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM || undefined, args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
  const context = await browser.newContext({viewport:{width:1280,height:960},serviceWorkers:'block'});
  const localOrigin = new URL(origin).origin;
  await context.route('**/*',route => new URL(route.request().url()).origin===localOrigin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(90_000);
  page.on('pageerror', error => errors.push(error.message));
  const modelRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('.glb.gz')) modelRequests.push(request.url());
  });
  async function openDetail(id, language) {
    const url = new URL('/',origin);
    url.searchParams.set('lang',language);
    url.hash='library?exercise='+id;
    await page.goto(url.href, {waitUntil:'domcontentloaded'});
    const detail = page.locator('.detail-main');
    await detail.waitFor();
    return detail;
  }
  async function center(locator) {
    await locator.evaluate(element => element.scrollIntoView({block:'center',behavior:'instant'}));
  }
  async function frame(locator, name) {
    await center(locator);
    return locator.screenshot(name ? {path:join(evidence,name)} : undefined);
  }
  const curl = await openDetail('barbell-curl','en');
  assert.ok(await curl.isVisible());
  assert.equal(modelRequests.length, 0);
  assert.equal(await curl.locator('canvas').count(),0);
  const open = curl.getByRole('button',{name:'3D Anatomical Demonstration',exact:true});
  await open.click();
  const player = curl.locator('[data-exercise-motion="barbell-curl"]');
  const canvas = player.locator('canvas');
  const slider = player.getByRole('slider');
  const pose = player.locator('[data-motion-angle]');
  await canvas.waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-exercise-motion] input[type=range]')?.disabled);
  await slider.focus();
  await slider.press('Home');
  const neutral = await frame(canvas,'curl-00-start.png');
  for (const [position,file] of [[25,'25-mid-lift'],[50,'50-top'],[75,'75-mid-return'],[100,'100-complete']]) {
    await slider.fill(String(position));
    assert.equal(await slider.inputValue(),String(position));
    await frame(canvas,'curl-'+file+'.png');
  }
  assert.equal(Number(await pose.getAttribute('data-motion-angle')),0,'loop completion should return to the start angle');
  await slider.fill('50');
  assert.ok(!(await frame(canvas)).equals(neutral),'mid repetition must change rendered geometry');
  await player.getByRole('button',{name:'Reset motion',exact:true}).click();
  assert.equal(await slider.inputValue(),'0');
  if (process.env.ANATOMY_RECORD==='1') {
    await player.getByRole('button',{name:'Play',exact:true}).click();
    await center(canvas);
    const recording = await canvas.evaluate(element => {
      const mimeType='video/webm;codecs=vp8';
      if (!element.captureStream || !globalThis.MediaRecorder?.isTypeSupported(mimeType)) return null;
      const stream=element.captureStream(12);
      const recorder=new MediaRecorder(stream,{mimeType});
      const chunks=[];
      return new Promise(resolve => {
        const finish = value => { for (const track of stream.getTracks()) track.stop(); resolve(value); };
        recorder.ondataavailable=event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror=() => finish(null);
        recorder.onstop=() => {
          const reader=new FileReader();
          reader.onload=() => finish(String(reader.result).split(',')[1]);
          reader.onerror=() => finish(null);
          reader.readAsDataURL(new Blob(chunks,{type:mimeType}));
        };
        recorder.start();
        setTimeout(() => { if (recorder.state!=='inactive') recorder.stop(); },5500);
      });
    });
    const videoBytes = recording ? Buffer.from(recording,'base64') : null;
    if (videoBytes && videoBytes.length>1024) await writeFile(join(evidence,'curl-actual-player.webm'),videoBytes);
    await player.getByRole('button',{name:'Pause',exact:true}).click();
    await player.getByRole('button',{name:'Reset motion',exact:true}).click();
  }
  await player.getByLabel('Animation speed',{exact:true}).selectOption('2');
  await player.getByRole('button',{name:'Play',exact:true}).click();
  await center(canvas);
  const sample = await pose.evaluate(async element => {
    let updates=0;
    const observer=new MutationObserver(records => { updates += records.length; });
    observer.observe(element,{attributes:true,attributeFilter:['data-motion-angle']});
    const start=performance.now();
    await new Promise(resolve => setTimeout(resolve,1400));
    observer.disconnect();
    return {updates,milliseconds:performance.now()-start};
  });
  assert.ok(sample.updates>1,'pose should advance while visible');
  await player.getByRole('button',{name:'Pause',exact:true}).click();
  const paused = await slider.inputValue();
  const beforeOrbit = await frame(canvas);
  await player.getByRole('button',{name:'Side view',exact:true}).click();
  assert.ok(!(await frame(canvas)).equals(beforeOrbit));
  assert.equal(await slider.inputValue(),paused,'camera changes preserve repetition position');
  await player.getByRole('button',{name:'Reset camera',exact:true}).click();

  await player.getByRole('button',{name:'Muscles in reference pose',exact:true}).click();
  assert.ok(await player.getByRole('button',{name:'Play',exact:true}).isDisabled());
  await player.getByRole('button',{name:'Highlight muscles',exact:true}).waitFor();
  await player.screenshot({path:join(evidence,'curl-muscle-roles-en.png')});
  const roleList = player.getByLabel('Muscle roles',{exact:true});
  const muscle = roleList.getByRole('button').first();
  const reference = await frame(canvas);
  await muscle.click();
  assert.equal(await muscle.getAttribute('aria-pressed'),'true');
  assert.ok(!(await frame(canvas)).equals(reference));
  await player.getByRole('button',{name:'Reset highlighting',exact:true}).click();
  assert.equal(await muscle.getAttribute('aria-pressed'),'false');
  const close = curl.getByRole('button',{name:'Close 3D demonstration',exact:true});
  await close.click();
  await canvas.waitFor({state:'detached'});
  await open.click();
  await canvas.waitFor();
  assert.equal(await curl.locator('canvas').count(),1);
  await close.click();
  checks.push({curl:'distinct start, lift, transition and return frames; orbit, speed, pause, reset, role selection and disposal',sample,modelRequests:modelRequests.length});

  for (const language of ['en','he']) {
    const detail = await openDetail('barbell-curl',language);
    await detail.getByRole('button',{name:language==='he'?'הדגמה אנטומית בתלת־ממד':'3D Anatomical Demonstration',exact:true}).click();
    const responsive = detail.locator('[data-exercise-motion="barbell-curl"]');
    await responsive.locator('canvas').waitFor();
    assert.equal(await responsive.getAttribute('dir'),language==='he'?'rtl':'ltr');
    for (const width of [320,390,430,768,1280]) {
      await page.setViewportSize({width,height:900});
      await responsive.getByRole('slider').scrollIntoViewIfNeeded();
      assert.ok(await responsive.evaluate(region => region.scrollWidth<=region.clientWidth+1),language+' player overflows at '+width);
      if (width===390) await responsive.screenshot({path:join(evidence,'curl-mobile-'+language+'.png')});
    }
    checks.push({responsive:{language,widths:[320,390,430,768,1280]}});
  }

  const bench = await openDetail('barbell-bench','en');
  await bench.getByRole('button',{name:/Movement and muscle demonstration/}).click();
  const video = bench.locator('video[src*="/anatomy/motion/bench.mp4"]');
  await video.waitFor();
  await video.evaluate(element => element.play());
  await page.waitForFunction(() => document.querySelector('video[src*="/anatomy/motion/bench.mp4"]')?.currentTime > .2);
  await video.evaluate(element => element.pause());
  const seekFraction = await video.evaluate(async element => {
    const seeked=new Promise(resolve => element.addEventListener('seeked',resolve,{once:true}));
    element.currentTime=element.duration/2;
    await seeked;
    return element.currentTime/element.duration;
  });
  assert.ok(Math.abs(seekFraction-.5)<.02);
  await frame(video,'bench-actual-detail.png');
  const squat = await openDetail('back-squat','en');
  assert.equal(await squat.locator('[data-exercise-motion], video[src*="/anatomy/motion/"]').count(),0);
  assert.equal(await squat.getByRole('button',{name:'3D Anatomical Demonstration',exact:true}).count(),0);
  await squat.screenshot({path:join(evidence,'squat-no-interactive-pilot.png')});
  checks.push({bench:'existing demonstration clip plays and seeks',squat:'detail available without generic movement'});
  await context.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:browser.version(),checks},null,2));
} finally {
  await writeFile(join(evidence,'exercise-animation-checks.json'),JSON.stringify({browser:browser?.version(),checks,errors},null,2));
  await browser?.close();
  await server?.close();
}

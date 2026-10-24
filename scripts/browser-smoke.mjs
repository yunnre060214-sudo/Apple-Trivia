import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {readChallenge,challengeURL} from '../src/challenge.mjs';
const root=resolve(new URL('../dist/',import.meta.url).pathname),output=process.env.QA_OUTPUT||'/tmp/apple-trivia-qa';await mkdir(output,{recursive:true});
const bank=JSON.parse(await readFile(resolve(root,'questions.json'),'utf8')).questions;
const mime={'.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.html':'text/html'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://local.test').pathname);const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));if(!file.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
const engine=process.env.QA_BROWSER==='webkit'?webkit:chromium,name=process.env.QA_BROWSER||'chromium',checks=[],errors=[];
let browser;
const live=(p,s)=>/^(html|\.theme-surface|#hello)/.test(s)?p.locator(s):p.locator('#site-content').locator(s);
const check=(label)=>{checks.push(label);console.log('PASS',label);};
try{
 browser=await engine.launch({headless:true,...(process.env.QA_EXECUTABLE?{executablePath:process.env.QA_EXECUTABLE}:{}),...(name==='chromium'?{args:['--no-sandbox']}: {})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 context.setDefaultTimeout(12000);
 if(name==='chromium')await context.grantPermissions(['clipboard-read','clipboard-write']);
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message)});
 async function open(p,url=base){await p.goto(url);await p.evaluate(()=>document.querySelector('#hello-skip')?.click());await p.waitForSelector('html:not(.hello-pending)');await p.evaluate(()=>document.fonts.ready);}
 const noOverflow=async(p)=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 await open(page);await page.waitForSelector('[data-topic="visual"]');
 await page.waitForTimeout(1400);await page.screenshot({path:resolve(output,`${name}-home-light.png`),fullPage:true});await noOverflow(page);
 for(const width of [320,393,768,1440]){await page.setViewportSize({width,height:900});await noOverflow(page);}
 check('home fits 320, 393, 768 and 1440px');
 await page.setViewportSize({width:1440,height:1000});
 const theme=await live(page,'#theme-toggle').getAttribute('aria-label');
 await live(page,'#theme-toggle').evaluate(el=>{for(let i=0;i<20;i++)el.click();});
 await page.waitForTimeout(1400);
 assert.equal(await live(page,'#theme-toggle').getAttribute('aria-label'),theme);
 assert.equal(await live(page,'html').getAttribute('data-theme-waves'),null);
 assert.ok(await live(page,'.theme-surface').count()<=1);
 assert.ok(!await live(page,'.theme-surface button').evaluateAll(nodes=>nodes.some(n=>n.tabIndex>=0)));
 check('20 rapid theme requests settle with one inert prepared scene');
 await live(page,'#theme-toggle').click();await page.waitForTimeout(1100);await page.screenshot({path:resolve(output,`${name}-home-dark.png`),fullPage:true});
 await live(page,'[data-topic="visual"]').click();
 const records=[];
 for(let i=0;i<5;i++){
  await live(page,'.question-media img').waitFor({state:'visible'});
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('apple-quiz:v1:session'))),row=s.questions[i],q=bank.find(q=>q.id===row.id);records.push({...q,options:row.options});
  assert.ok(await live(page,'.question-media img').evaluate(i=>i.complete&&i.naturalWidth>0));
  if(i===0){await live(page,'#auto-toggle').uncheck();await page.waitForTimeout(350);await page.screenshot({path:resolve(output,`${name}-visual-desktop.png`),fullPage:true});}
  await live(page,`[data-answer="${row.options.indexOf(q.answer)}"]`).click();
  if(i===0){await live(page,'[data-action="explain"]').click();await page.waitForTimeout(400);assert.equal(await live(page,'.explanation-drawer').getAttribute('aria-hidden'),'false');await live(page,'[data-action="explain"]').click();}
  await live(page,'.quick-next').click();
 }
 await live(page,'.result-shell').waitFor();assert.equal(await live(page,'.result-score strong').getAttribute('data-final'),'100');check('five images, reversible explanation and correct result');
 await page.screenshot({path:resolve(output,`${name}-result-dark.png`),fullPage:true});
 await live(page,'[data-action="share-card"]').click();await live(page,'.share-preview img').waitFor();
 await page.screenshot({path:resolve(output,`${name}-share.png`),fullPage:true});
 const [download]=await Promise.all([page.waitForEvent('download'),live(page,'[data-action="download"]').click()]);await download.saveAs(resolve(output,`${name}-share-card.png`));
 let url;
 if(name==='chromium'){await live(page,'[data-action="copy-challenge"]').click();url=await page.evaluate(()=>navigator.clipboard.readText());}
 else{const {challengeURL}=await import('../src/challenge.mjs');url=challengeURL(records,base);}
 const decoded=readChallenge(new URL(url).hash.slice(11),bank);assert.equal(decoded.ok,true);assert.deepEqual(decoded.questions.map(q=>q.options),records.map(q=>q.options));
 await writeFile(resolve(output,`${name}-challenge-url.txt`),url);check('share PNG and exact challenge link');
 await live(page,'.modal-close').click();await live(page,'#modal').waitFor({state:'hidden'});
 const friend=await context.newPage();friend.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message)});await open(friend,base+new URL(url).hash);await live(friend,'[data-action="challenge-start"]').click();
 for(let i=0;i<2;i++){assert.deepEqual(await live(friend,'.answer-text').allTextContents(),records[i].options);await live(friend,'[data-answer="0"]').click();await live(friend,'#advance').click();}
 await friend.reload();await live(friend,'#hello-skip').click();await live(friend,'[data-action="resume"]').click();
 assert.deepEqual(await live(friend,'.answer-text').allTextContents(),records[2].options);check('challenge order and progress survive reload');
 await friend.setViewportSize({width:393,height:852});await noOverflow(friend);await friend.screenshot({path:resolve(output,`${name}-visual-mobile.png`),fullPage:true});
 await live(friend,'#theme-toggle').evaluate(el=>{for(let i=0;i<7;i++)el.click();});await friend.evaluate(()=>window.scrollTo(0,40));await live(friend,'[data-action="home"]').click();await live(friend,'.hero-start').waitFor();assert.equal(await live(friend,'html').getAttribute('data-theme-waves'),null);check('navigation and scroll cancel in-flight masks');
 await friend.emulateMedia({reducedMotion:'reduce'});await live(friend,'#theme-toggle').click();assert.equal(await live(friend,'html').getAttribute('data-theme-waves'),null);check('reduced motion keeps instant usable controls');
 await friend.route('**/assets/visual/**',route=>route.abort());await live(friend,'[data-topic="visual"]').click();await live(friend,'.media-fallback:not([hidden])').waitFor();await live(friend,'[data-answer="0"]').click();await live(friend,'.quick-next').click();check('failed images retain readable playable questions');
 await open(friend,base+'#challenge=invalid');await live(friend,'.challenge-shell h1').waitFor();assert.match(await live(friend,'.challenge-shell h1').textContent(),/无法打开/);await live(friend,'[data-action="home"]').click();check('invalid links return safely to the home');
 // Long text and a 500-question custom round exercise the non-quick layout.
 const longQuestion=[...bank].sort((a,b)=>b.prompt.length-a.prompt.length)[0];
 await open(friend,base+new URL(challengeURL([longQuestion],base)).hash);await live(friend,'[data-action="challenge-start"]').click();await noOverflow(friend);
 await friend.evaluate(()=>{const key='apple-quiz:v1:session',s=JSON.parse(localStorage.getItem(key));s.version='3.7.0';delete s.config.challenge;localStorage.setItem(key,JSON.stringify(s));});
 await open(friend);await live(friend,'[data-action="resume"]').click();assert.equal(await live(friend,'#question-prompt').textContent(),longQuestion.prompt);check('long text and an actual 3.7.0 save render on mobile');
 await live(friend,'[data-action="home"]').click();await live(friend,'[data-action="custom"]').click();await live(friend,'[data-count="500"]').click();await live(friend,'select[name="mode"]').selectOption('exam');await live(friend,'#custom-form [type="submit"]').click();
 await live(friend,'[data-action="map"]').click();assert.equal(await live(friend,'.map-cell').count(),500);await noOverflow(friend);await live(friend,'[data-action="end-round"]').click();await live(friend,'[data-action="finish"]').click();await live(friend,'[data-action="share-card"]').click();await live(friend,'.share-preview img').waitFor();
 assert.match(await live(friend,'.challenge-share p').textContent(),/本局题目较多/);check('500-question navigation, unanswered result and long-link sharing');
 await live(friend,'.modal-close').click();
 const blocked=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})});
 const p=await blocked.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message)});await open(p);await live(p,'.hero-start').click();await live(p,'.answer').first().click();await live(p,'.feedback.visible').waitFor();check('blocked storage does not prevent starting or answering');await blocked.close();
 assert.deepEqual(errors,[]);await writeFile(resolve(output,`${name}-report.json`),JSON.stringify({browser:name,checks,errors},null,2));
 console.log(`${checks.length} browser scenarios passed (${name}).`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}

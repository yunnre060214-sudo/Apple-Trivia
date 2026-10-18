import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createThemeSwitcher,setBrowserTheme} from '../assets/theme.mjs';

function fixture({theme='light', supported=true, reduce=false, width=390, height=844, snapshotWidth=width, snapshotHeight=height, bounds={left:320,top:18,width:44,height:44}, fail, defer=false}={}) {
  const values=new Map(), classes=new Set(), applied=[], saved=[], committed=[];
  const root={dataset:{theme,browserTheme:theme},style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
  let skipCount=0, captures=0;
  const transitions=[];
  const meta={content:theme==='dark'?'#101216':'#f5f4f0'};
  const document={documentElement:root,querySelector:()=>meta};
  if(supported)document.startViewTransition=update=>{
    captures++;
    if(fail==='start')throw Error('unavailable');
    let finish;
    const finished=new Promise(resolve=>{finish=resolve;});
    if(!defer)update();
    const transition={update,finish,ready:fail==='ready'?Promise.reject(Error('skipped')):Promise.resolve(),finished,skipTransition(){skipCount++;finish();}};
    transitions.push(transition);
    return transition;
  };
  const window={innerWidth:width,innerHeight:height,getComputedStyle:(_,pseudo)=>pseudo?{width:`${snapshotWidth}px`,height:`${snapshotHeight}px`}:{getPropertyValue:()=>root.dataset.theme==='dark'?'#101216':'#f5f4f0'}};
  const switchTheme=createThemeSwitcher({document,window,applyTheme:v=>{root.dataset.theme=v;applied.push(v);},saveTheme:v=>saved.push(v),commitTheme:v=>{setBrowserTheme(document,v);committed.push(v);},reducedMotion:()=>reduce});
  return {switchTheme,button:{getBoundingClientRect:()=>bounds},root,meta,values,classes,applied,saved,committed,transitions,finish:()=>transitions.at(-1).finish(),get skips(){return skipCount;},get captures(){return captures;}};
}

test('both appearance directions reveal from the button center and cover every viewport corner',async()=>{
  for(const theme of ['light','dark'])for(const geometry of [
    {width:390,height:844,bounds:{left:320,top:18,width:44,height:44}},
    {width:1440,height:900,bounds:{left:1236,top:26,width:44,height:44}},
    {width:844,height:390,bounds:{left:760,top:12,width:44,height:44}},
  ]) {
    const f=fixture({theme,...geometry});const pending=f.switchTheme(f.button);await Promise.resolve();
    const x=parseFloat(f.values.get('--theme-reveal-x')),y=parseFloat(f.values.get('--theme-reveal-y')),r=parseFloat(f.values.get('--theme-reveal-radius'));
    assert.equal(x,geometry.bounds.left+22);assert.equal(y,geometry.bounds.top+22);
    for(const [cx,cy] of [[0,0],[geometry.width,0],[0,geometry.height],[geometry.width,geometry.height]])assert.ok(r>Math.hypot(cx-x,cy-y));
    assert.equal(f.root.dataset.theme,theme==='dark'?'light':'dark');assert.equal(f.classes.has('theme-revealing'),true);
    f.finish();assert.equal(await pending,true);assert.equal(f.values.size,0);assert.equal(f.classes.size,0);assert.equal(f.saved.length,1);
  }
});
test('every rapid click reverses direction and superseded finalizers leave the current reveal intact',async()=>{
  const f=fixture(),requests=[];
  for(let i=0;i<8;i++)requests.push(f.switchTheme(f.button));
  await Promise.resolve();await Promise.resolve();
  assert.equal(f.captures,8);assert.equal(f.skips,7);
  assert.deepEqual(f.saved,['dark','light','dark','light','dark','light','dark','light']);
  assert.equal(f.classes.has('theme-revealing'),true);assert.equal(f.committed.length,0);
  assert.equal(f.root.dataset.theme,'light');f.finish();
  assert.ok((await Promise.all(requests)).every(Boolean));
  assert.deepEqual(f.committed,['light']);assert.equal(f.values.size,0);assert.equal(f.classes.size,0);
});
test('clicks before capture callbacks run preserve click parity and discard stale updates',async()=>{
  for(const count of [2,3,16,17]) {
    const f=fixture({defer:true}),requests=[];
    for(let i=0;i<count;i++)requests.push(f.switchTheme(f.button));
    for(const transition of [...f.transitions].reverse())transition.update();
    assert.deepEqual(f.saved,[count%2?'dark':'light']);
    await Promise.resolve();f.finish();await Promise.all(requests);
    assert.equal(f.root.dataset.theme,count%2?'dark':'light');
    assert.equal(f.root.dataset.browserTheme,f.root.dataset.theme);assert.equal(f.values.size,0);
  }
});
test('mobile toolbar areas remain covered when the snapshot exceeds the visible viewport',async()=>{
  const f=fixture({width:390,height:680,snapshotWidth:390,snapshotHeight:844});
  const pending=f.switchTheme(f.button);await Promise.resolve();
  const x=parseFloat(f.values.get('--theme-reveal-x')),y=parseFloat(f.values.get('--theme-reveal-y')),r=parseFloat(f.values.get('--theme-reveal-radius'));
  for(const [cx,cy] of [[0,844],[390,844]])assert.ok(r>Math.hypot(cx-x,cy-y));
  f.finish();await pending;
});
test('page appearance changes first while Safari backing and metadata remain old until completion',async()=>{
  for(const theme of ['light','dark']) {
    const f=fixture({theme}),pending=f.switchTheme(f.button);await Promise.resolve();
    assert.equal(f.values.get('--theme-reveal-backdrop'),theme==='dark'?'#101216':'#f5f4f0');
    assert.notEqual(f.root.dataset.theme,theme);assert.deepEqual(f.committed,[]);
    assert.equal(f.root.dataset.browserTheme,theme);
    assert.equal(f.meta.content,theme==='dark'?'#101216':'#f5f4f0');
    f.finish();await pending;assert.deepEqual(f.committed,[theme==='dark'?'light':'dark']);
    assert.equal(f.root.dataset.browserTheme,f.root.dataset.theme);
    assert.equal(f.meta.content,theme==='dark'?'#f5f4f0':'#101216');
    assert.equal(f.values.size,0);
  }
});
test('unsupported browsers and reduced motion still switch and save the appearance once',async()=>{
  for(const options of [{supported:false},{reduce:true}]) {
    const f=fixture(options);assert.equal(await f.switchTheme(f.button),true);
    assert.deepEqual(f.applied,['dark']);assert.deepEqual(f.saved,['dark']);assert.equal(f.captures,0);assert.equal(f.classes.size,0);
    assert.deepEqual(f.committed,['dark']);
    assert.equal(f.root.dataset.browserTheme,'dark');assert.equal(f.meta.content,'#101216');
  }
});
test('failed or skipped captures apply the appearance without leaving an overlay or lock',async()=>{
  for(const fail of ['start','ready']) {
    const f=fixture({fail});assert.equal(await f.switchTheme(f.button),true);
    assert.deepEqual(f.applied,['dark']);assert.deepEqual(f.saved,['dark']);assert.equal(f.values.size,0);assert.equal(f.classes.size,0);
    assert.equal(f.root.dataset.browserTheme,'dark');assert.equal(f.meta.content,'#101216');
    await f.switchTheme(f.button);assert.equal(f.root.dataset.theme,'light');
    assert.equal(f.root.dataset.browserTheme,'light');assert.equal(f.meta.content,'#f5f4f0');
  }
});
test('an external appearance change during capture commits the latest page state',async()=>{
  const f=fixture(),pending=f.switchTheme(f.button);await Promise.resolve();
  assert.equal(f.root.dataset.theme,'dark');assert.equal(f.root.dataset.browserTheme,'light');
  f.root.dataset.theme='light';
  f.finish();await pending;
  assert.deepEqual(f.committed,['light']);assert.equal(f.root.dataset.browserTheme,'light');assert.equal(f.meta.content,'#f5f4f0');
});
test('browser-theme synchronization tolerates a missing theme-color meta element',()=>{
  const document={documentElement:{dataset:{}},querySelector:()=>null};
  setBrowserTheme(document,'dark');assert.equal(document.documentElement.dataset.browserTheme,'dark');
  setBrowserTheme(document,'unknown');assert.equal(document.documentElement.dataset.browserTheme,'light');
});

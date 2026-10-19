import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createThemeSwitcher,setBrowserTheme} from '../assets/theme.mjs';

function fixture({theme='light',reduce=false,supported=true,fail=false,width=390,height=844}={}) {
  const classes=new Set(),saved=[],committed=[],surfaces=[],animations=[],timers=new Map(),events=new Map(),windowEvents=new Map();
  let timerId=0;
  const root={dataset:{theme,browserTheme:theme},clientWidth:width,clientHeight:height,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
  const document={documentElement:root,createElement:()=>({animate:supported?()=>{}:undefined}),addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
  const preference={addEventListener:(_,fn)=>preference.change=fn,removeEventListener:()=>preference.change=null};
  const window={innerWidth:width,innerHeight:height,visualViewport:{width,height},matchMedia:()=>preference,setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),addEventListener:(k,v)=>windowEvents.set(k,v),removeEventListener:k=>windowEvents.delete(k)};
  const createSurface=({theme})=>{
    if(fail)throw Error('no snapshot');
    const surface={theme,removed:false,style:{},classList:{add(){}},remove(){this.removed=true;},animate(keyframes,options){
      let finish,reject;
      const animation={finished:new Promise((yes,no)=>{finish=yes;reject=no;}),finish:()=>finish(),cancel:()=>{animation.cancelled=true;reject(Error('cancelled'));},keyframes,options};
      animations.push(animation);return animation;
    }};
    surfaces.push(surface);return surface;
  };
  const switchTheme=createThemeSwitcher({document,window,createSurface,applyTheme:v=>root.dataset.theme=v,saveTheme:v=>saved.push(v),commitTheme:v=>{root.dataset.browserTheme=v;committed.push(v);},reducedMotion:()=>reduce});
  return {root,classes,saved,committed,surfaces,animations,timers,events,windowEvents,window,document,preference,switchTheme,button:{getBoundingClientRect:()=>({left:320,top:18,width:44,height:44})}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('each of 3, 5 and 20 immediate clicks starts an independent wave without cancelling previous waves',async()=>{
  for(const count of [3,5,20]) {
    const f=fixture(),requests=[];
    for(let i=0;i<count;i++)requests.push(f.switchTheme(f.button));
    assert.equal(f.animations.length,count);assert.equal(f.surfaces.length,count+1);
    assert.equal(f.root.dataset.themeWaves,String(count));assert.equal(f.root.dataset.theme,count%2?'dark':'light');
    assert.equal(f.saved.length,count);assert.equal(f.committed.length,0);
    assert.ok(f.animations.every(a=>!a.cancelled));
    for(const animation of f.animations){animation.finish();await flush();}
    assert.ok((await Promise.all(requests)).every(Boolean));
    assert.ok(f.surfaces.every(s=>s.removed));assert.equal(f.timers.size,0);
    assert.deepEqual(f.committed,[count%2?'dark':'light']);assert.equal(f.root.dataset.themeWaves,undefined);
  }
});
test('completed older waves form the solid floor under younger waves, and cannot erase them',async()=>{
  const f=fixture();const a=f.switchTheme(f.button),b=f.switchTheme(f.button),c=f.switchTheme(f.button);
  f.animations[0].finish();await a;
  assert.equal(f.animations[0].cancelled,true);assert.equal(f.surfaces[1].style.clipPath,'none');
  assert.equal(f.surfaces[0].removed,true);assert.equal(f.surfaces[1].removed,false);
  assert.equal(f.surfaces[3].removed,false);assert.equal(f.classes.has('theme-revealing'),true);assert.equal(f.committed.length,0);
  f.animations[1].finish();await b;
  assert.equal(f.surfaces[1].removed,true);assert.equal(f.surfaces[2].removed,false);
  f.animations[2].finish();await c;
  assert.equal(f.classes.size,0);assert.deepEqual(f.committed,['dark']);
});
test('the wave originates at the control and covers mobile, desktop and expanded toolbar areas',async()=>{
  for(const [width,height] of [[390,844],[1440,900],[844,390]]) {
    const f=fixture({width,height});f.window.visualViewport.height=height+100;
    const pending=f.switchTheme(f.button),[from,to]=f.animations[0].keyframes;
    const [r,x,y]=[...to.clipPath.matchAll(/([\d.]+)px/g)].map(m=>Number(m[1]));
    assert.equal(from.clipPath,'circle(0px at 342px 40px)');assert.equal(x,342);assert.equal(y,40);
    for(const [cx,cy] of [[0,0],[width,0],[0,height+100],[width,height+100]])assert.ok(r>Math.hypot(cx-x,cy-y));
    f.animations[0].finish();await pending;
  }
});
test('Safari backing stays old through mixed waves and commits only the final appearance',async()=>{
  for(const theme of ['light','dark']) {
    const f=fixture({theme}),a=f.switchTheme(f.button),b=f.switchTheme(f.button);
    assert.equal(f.root.dataset.browserTheme,theme);assert.equal(f.committed.length,0);
    f.animations[0].finish();await a;assert.equal(f.committed.length,0);
    f.animations[1].finish();await b;assert.deepEqual(f.committed,[theme]);
  }
});
test('reduced motion, unsupported animations and failed copies still switch and save immediately',async()=>{
  for(const options of [{reduce:true},{supported:false},{fail:true}]) {
    const f=fixture(options);assert.equal(await f.switchTheme(f.button),true);
    assert.deepEqual(f.saved,['dark']);assert.deepEqual(f.committed,['dark']);assert.equal(f.classes.size,0);assert.equal(f.animations.length,0);
    await f.switchTheme(f.button);assert.equal(f.root.dataset.theme,'light');
  }
});
test('scroll, resize, pagehide and another action settle visual copies without delaying navigation',async()=>{
  for(const event of ['scroll','resize','pagehide','action']) {
    const f=fixture(),a=f.switchTheme(f.button),b=f.switchTheme(f.button);
    if(event==='action')f.events.get('click')({target:{closest:()=>null}});else f.windowEvents.get(event)();
    await Promise.all([a,b]);assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);assert.ok(f.surfaces.every(s=>s.removed));
    assert.deepEqual(f.committed,['light']);f.switchTheme.dispose();assert.equal(f.events.size,0);assert.equal(f.windowEvents.size,0);
  }
});
test('animation timeout cleanup cannot leave a persistent visual curtain',async()=>{
  const f=fixture(),pending=f.switchTheme(f.button);
  [...f.timers.values()].forEach(fn=>fn());await pending;
  assert.ok(f.surfaces.every(s=>s.removed));assert.equal(f.root.dataset.themeWaves,undefined);assert.equal(f.timers.size,0);
});
test('browser backing and theme-color use the independent night palette',()=>{
  const meta={content:''},doc={documentElement:{dataset:{}},querySelector:()=>meta};
  setBrowserTheme(doc,'dark');assert.equal(meta.content,'#080d1b');assert.equal(doc.documentElement.dataset.browserTheme,'dark');
  setBrowserTheme(doc,'light');assert.equal(meta.content,'#f5f4f0');
  setBrowserTheme({documentElement:{dataset:{}},querySelector:()=>null},'dark');
});

test('a newer wave completing first cancels stale animations and clears their timers',async()=>{
  const f=fixture(),pending=[f.switchTheme(f.button),f.switchTheme(f.button),f.switchTheme(f.button)];
  f.animations[2].finish();await Promise.all(pending);
  assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);assert.ok(f.surfaces.every(s=>s.removed));
  assert.deepEqual(f.committed,['dark']);
});

test('backgrounding, keyboard navigation and reduced-motion changes release all wave work immediately',async()=>{
  for(const event of ['hidden','navigation','motion']) {
    const f=fixture(),pending=[f.switchTheme(f.button),f.switchTheme(f.button)];
    if(event==='hidden'){f.document.hidden=true;f.events.get('visibilitychange')();}
    else if(event==='motion')f.preference.change({matches:true});
    else f.switchTheme.settle();
    await Promise.all(pending);assert.ok(f.surfaces.every(s=>s.removed));assert.equal(f.timers.size,0);
    assert.ok(f.animations.every(a=>a.cancelled));assert.deepEqual(f.committed,['light']);
    f.switchTheme.dispose();assert.equal(f.preference.change,null);assert.equal(f.events.size,0);
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createThemeSwitcher,setBrowserTheme} from '../assets/theme.mjs';
import {synchronizeAnimations} from '../assets/theme-scene.mjs';

function fixture({theme='light',reduce=false,supported=true,fail=false,width=390,height=844,cold=false,page=false}={}) {
  const classes=new Set(),saved=[],previewed=[],committed=[],scenes=[],animations=[],timers=new Map(),idles=new Map(),frames=new Map(),events=new Map(),windowEvents=new Map();
  let id=0,time=0;
  const root={dataset:{theme,browserTheme:theme},clientWidth:width,clientHeight:height,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)}};
  const document={documentElement:root,getElementById:()=>page?{}:null,createElement:()=>({animate:supported?()=>{}:undefined}),addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
  const preference={matches:reduce,addEventListener:(_,fn)=>preference.change=fn,removeEventListener:()=>preference.change=null};
  const window={innerWidth:width,innerHeight:height,visualViewport:{width,height},performance:{now:()=>time},matchMedia:()=>preference,
    setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),
    requestIdleCallback:fn=>{idles.set(++id,fn);return id;},cancelIdleCallback:id=>idles.delete(id),
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    addEventListener:(k,v)=>windowEvents.set(k,v),removeEventListener:k=>windowEvents.delete(k)};
  const createScene=({theme,width,height})=>{
    if(fail)throw Error('no scene');
    const scene={theme,width,height,begins:0,removed:false,floors:[],waves:[],begin(){this.begins++;},updateControl(){},setFloor(show){this.floors.push(show);},dispose(){this.removed=true;},addWave(data){
      let finish,reject;
      const animation={finished:new Promise((yes,no)=>{finish=yes;reject=no;}),finish:()=>finish(),cancel:()=>{animation.cancelled=true;reject(Error('cancelled'));}};
      const wave={...data,animation,removed:false,remove(){this.removed=true;}};this.waves.push(wave);animations.push(animation);return wave;
    }};scenes.push(scene);return scene;
  };
  const switchTheme=createThemeSwitcher({document,window,createScene,applyTheme:v=>root.dataset.theme=v,previewTheme:v=>previewed.push(v),saveTheme:v=>saved.push(v),commitTheme:v=>{root.dataset.browserTheme=v;committed.push(v);},reducedMotion:()=>preference.matches});
  const run=map=>{for(const [key,fn]of [...map]){map.delete(key);fn();}};
  const f={root,classes,saved,previewed,committed,scenes,animations,timers,idles,frames,events,windowEvents,window,document,preference,switchTheme,idle:()=>run(idles),frame:()=>run(frames),advance:ms=>time+=ms,button:{getBoundingClientRect:()=>({left:320,top:18,width:44,height:44})}};
  if(!cold)f.idle();return f;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('3, 5 and 20 clicks reuse one prepared live page, immediately update the control and add only mask circles',async()=>{
  for(const count of [3,5,20]) {
    const f=fixture(),requests=[];
    for(let i=0;i<count;i++)requests.push(f.switchTheme(f.button));
    assert.equal(f.scenes.length,1);assert.equal(f.scenes[0].begins,1);assert.equal(f.animations.length,count);
    assert.equal(f.root.dataset.theme,'light');assert.equal(f.root.dataset.themeTarget,count%2?'dark':'light');
    assert.equal(f.root.dataset.themeWaves,String(count));assert.equal(f.saved.length,count);assert.equal(f.previewed.length,count);
    assert.deepEqual(f.scenes[0].waves.map(w=>w.show),Array.from({length:count},(_,i)=>i%2===0));
    assert.ok(f.animations.every(a=>!a.cancelled));f.animations.at(-1).finish();await Promise.all(requests);
    assert.equal(f.scenes[0].removed,true);assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);
    assert.deepEqual(f.committed,[count%2?'dark':'light']);assert.equal(f.root.dataset.theme,count%2?'dark':'light');
    f.switchTheme.dispose();assert.equal(f.idles.size,0);
  }
});
test('cold input responds immediately and coalesces preparation for the entire burst into one frame',async()=>{
  const f=fixture({cold:true}),a=f.switchTheme(f.button);f.advance(30);const b=f.switchTheme(f.button);f.advance(20);const c=f.switchTheme(f.button);
  assert.deepEqual(f.previewed,['dark','light','dark']);assert.equal(f.scenes.length,0);assert.equal(f.frames.size,1);
  f.frame();assert.equal(f.scenes.length,1);assert.deepEqual(f.animations.map(a=>a.currentTime),[50,20,0]);
  f.animations.at(-1).finish();await Promise.all([a,b,c]);f.switchTheme.dispose();
});
test('completed mask floors preserve younger waves and prune older animation records',async()=>{
  const f=fixture(),a=f.switchTheme(f.button),b=f.switchTheme(f.button),c=f.switchTheme(f.button);
  f.animations[0].finish();await a;
  assert.deepEqual(f.scenes[0].floors,[true]);assert.equal(f.scenes[0].waves[0].removed,true);assert.equal(f.scenes[0].waves[1].removed,false);
  assert.equal(f.animations[1].cancelled,undefined);assert.equal(f.committed.length,0);
  f.animations[1].finish();await b;assert.deepEqual(f.scenes[0].floors,[true,false]);
  f.animations[2].finish();await c;assert.deepEqual(f.committed,['dark']);f.switchTheme.dispose();
});
test('mask circles start at the button and cover mobile, desktop and expanded browser toolbar areas',async()=>{
  for(const [width,height]of [[390,844],[1440,900],[844,390]]) {
    const f=fixture({width,height,cold:true});f.window.visualViewport.height=height+100;f.idle();
    const request=f.switchTheme(f.button),wave=f.scenes[0].waves[0];
    assert.equal(wave.x,342);assert.equal(wave.y,40);
    for(const [x,y]of [[0,0],[width,0],[0,height+100],[width,height+100]])assert.ok(wave.radius>Math.hypot(x-wave.x,y-wave.y));
    f.animations[0].finish();await request;f.switchTheme.dispose();
  }
});
test('browser chrome and the real palette commit only after the last wave without restarting source animation clocks',async()=>{
  for(const theme of ['light','dark']) {
    const f=fixture({theme}),a=f.switchTheme(f.button),b=f.switchTheme(f.button);
    assert.equal(f.root.dataset.browserTheme,theme);assert.equal(f.root.dataset.theme,theme);
    f.animations[0].finish();await a;assert.equal(f.committed.length,0);
    f.animations[1].finish();await b;assert.deepEqual(f.committed,[theme]);f.switchTheme.dispose();
  }
});
test('reduced motion, missing animation support and failed preparation remain immediately usable',async()=>{
  for(const options of [{reduce:true},{supported:false},{fail:true}]) {
    const f=fixture(options),pending=f.switchTheme(f.button);f.frame();await pending;
    assert.deepEqual(f.saved,['dark']);assert.deepEqual(f.committed,['dark']);assert.equal(f.classes.size,0);
    const next=f.switchTheme(f.button);f.frame();await next;assert.equal(f.root.dataset.theme,'light');f.switchTheme.dispose();
  }
});
test('navigation, visibility, viewport and motion preference changes clean both prepared scenes and active masks',async()=>{
  for(const event of ['scroll','resize','pagehide','action','hidden','motion','keyboard']) {
    const f=fixture(),a=f.switchTheme(f.button),b=f.switchTheme(f.button);
    if(event==='action')f.events.get('click')({target:{closest:()=>null}});
    else if(event==='hidden'){f.document.hidden=true;f.events.get('visibilitychange')();}
    else if(event==='motion'){f.preference.matches=true;f.preference.change({matches:true});}
    else if(event==='keyboard')f.switchTheme.settle();else f.windowEvents.get(event)();
    await Promise.all([a,b]);assert.equal(f.timers.size,0);assert.equal(f.classes.size,0);assert.ok(f.scenes.every(s=>s.removed));
    f.switchTheme.dispose();assert.equal(f.idles.size,0);assert.equal(f.frames.size,0);assert.equal(f.events.size,0);assert.equal(f.windowEvents.size,0);
  }
});
test('timeout fallback and newer completions cannot leave stale masks or overwrite an external appearance',async()=>{
  const f=fixture(),pending=[f.switchTheme(f.button),f.switchTheme(f.button),f.switchTheme(f.button)];
  [...f.timers.values()].at(-1)();await Promise.all(pending);assert.equal(f.timers.size,0);assert.equal(f.scenes[0].removed,true);
  f.idle();const old=f.switchTheme(f.button);f.switchTheme.settle('dark');await old;await flush();
  assert.equal(f.root.dataset.theme,'dark');assert.equal(f.root.dataset.browserTheme,'dark');f.switchTheme.dispose();
});
test('running, delayed, paused and completed CSS animations inherit original clocks without sampling computed styles',()=>{
  const originals=[],copies=[],mapping=new Map();
  for(const [i,state]of ['running','paused','finished'].entries()) {
    const source={},copy={};mapping.set(copy,source);
    originals.push({animationName:`loop-${i}`,effect:{target:source},playState:state,startTime:100-i*500,currentTime:600+i*200,playbackRate:1});
    copies.push({animationName:`loop-${i}`,effect:{target:copy},play(){this.running=true;},pause(){this.paused=true;}});
  }
  synchronizeAnimations(originals,copies,mapping);
  assert.equal(copies[0].startTime,100);assert.equal(copies[0].running,true);
  assert.equal(copies[1].paused,true);assert.equal(copies[1].currentTime,800);
  assert.equal(copies[2].paused,true);assert.equal(copies[2].currentTime,1000);
  assert.ok(originals.every(a=>!('running'in a)&&!('paused'in a)));
});
test('browser backing retains the independent dark palette',()=>{
  const meta={content:''},doc={documentElement:{dataset:{}},querySelector:()=>meta};
  setBrowserTheme(doc,'dark');assert.equal(meta.content,'#080d1b');assert.equal(doc.documentElement.dataset.browserTheme,'dark');
  setBrowserTheme(doc,'light');assert.equal(meta.content,'#f5f4f0');
});

test('in-flight press and entry effects mirror their existing keyframes and phase without touching the originals',()=>{
  const source={},made=[];
  const copy={animate(keyframes,timing){const animation={keyframes,timing,play(){this.running=true;},pause(){}};made.push(animation);return animation;}};
  const original={effect:{target:source,getKeyframes:()=>[{opacity:0},{opacity:1}],getTiming:()=>({duration:220,fill:'both'})},playState:'running',playbackRate:1,startTime:500,currentTime:50};
  const mirrored=synchronizeAnimations([original],[],new Map([[copy,source]]));
  assert.equal(mirrored.length,1);assert.equal(made[0].startTime,500);assert.deepEqual(made[0].timing,{duration:220,fill:'both'});
  assert.equal(original.startTime,500);assert.equal(original.currentTime,50);
});

test('final palette commits suppress a second color transition without imposing an input cooldown',async()=>{
  const f=fixture({page:true}),first=f.switchTheme(f.button);f.animations[0].finish();await first;
  assert.equal(f.root.dataset.theme,'dark');assert.equal(f.classes.has('theme-committing'),true);
  f.idle();const second=f.switchTheme(f.button);assert.equal(f.animations.length,2);
  f.frame();f.frame();assert.equal(f.classes.has('theme-committing'),false);
  f.animations[1].finish();await second;f.switchTheme.dispose();
  assert.equal(f.frames.size,0);assert.equal(f.classes.size,0);
});

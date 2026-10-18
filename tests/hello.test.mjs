import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHelloController} from '../assets/hello.mjs';

function fixture({hidden = false} = {}) {
  const scheduled = new Map(), frames = new Map();
  let now = 0, id = 0;
  const document = {activeElement:null, hidden};
  function element() {
    const classes = new Set(), events = new Map(), attributes = new Map(), styles = new Map();
    return {isConnected:true, hidden:false, inert:false,
      classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v),toggle(v,on){if(on)classes.add(v);else classes.delete(v);}},
      style:{setProperty:(name,value)=>styles.set(name,value),getPropertyValue:name=>styles.get(name)},
      focus(){document.activeElement=this;},
      addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),
      emit:(name,event={})=>events.get(name)?.(event),
      setAttribute:(name,value)=>attributes.set(name,value),getAttribute:name=>attributes.get(name),
    };
  }
  Object.assign(document,element());document.hidden=hidden;document.documentElement=element();document.body=element();document.activeElement=document.body;
  const nodes=Object.fromEntries(['hello-intro','hello-skip','site-content','main'].map(x=>[x,element()]));
  const strokes=[element(),element()];strokes.forEach((s,i)=>s.getTotalLength=()=>i?2500:505);
  nodes['hello-intro'].querySelectorAll=()=>strokes;
  document.getElementById=id=>nodes[id];
  const setTimer=(fn,ms)=>{scheduled.set(++id,{fn,at:now+ms});return id;};
  const clearTimer=id=>scheduled.delete(id);
  const requestFrame=fn=>{frames.set(++id,fn);return id;};
  const cancelFrame=id=>frames.delete(id);
  const paint=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
  const advance=ms=>{const end=now+ms;while(true){const next=[...scheduled].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;scheduled.delete(next[0]);next[1].fn();}now=end;};
  const controller=createHelloController({document,setTimer,clearTimer,now:()=>now,requestFrame,cancelFrame});
  const play=options=>{const result=controller.play(options);paint();paint();return result;};
  const end=()=>nodes['hello-intro'].emit('animationend',{animationName:'hello-write',target:strokes[1]});
  const visibility=value=>{document.hidden=value;document.emit('visibilitychange');};
  return {document,nodes,strokes,advance,controller,play,end,paint,visibility,scheduled,frames};
}

test('every load starts the intro with skip available, independent of stored completion',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for(const returning of [false,true])for(const reduce of [false,true]) {
    const f=fixture();
    runInNewContext(bootstrap,{document:f.document,localStorage:{getItem(){return returning?'1':null;}},matchMedia:()=>({matches:reduce})});
    assert.equal(f.document.documentElement.classList.contains('hello-pending'),true);
    assert.equal(f.play(),true);assert.equal(f.nodes['site-content'].inert,true);
  }
  assert.match(html,/id="hello-skip"/);assert.ok(!html.includes('pathLength='));
});
test('initial paint precedes writing; the page remains locked through handwriting, hold and fade',()=>{
  const f=fixture();assert.equal(f.controller.play(),true);
  assert.equal(f.nodes['hello-intro'].classList.contains('hello-playing'),false);
  assert.equal(f.document.activeElement,f.nodes['hello-intro']);assert.equal(f.nodes['site-content'].inert,true);
  f.paint();assert.equal(f.nodes['hello-intro'].classList.contains('hello-playing'),false);f.paint();
  assert.equal(f.nodes['hello-intro'].classList.contains('hello-playing'),true);
  assert.equal(f.strokes[0].style.getPropertyValue('--hello-length'),'505');
  f.advance(3600);f.end();f.advance(499);assert.equal(f.nodes['site-content'].inert,true);
  f.advance(1);assert.equal(f.nodes['hello-intro'].classList.contains('hello-leaving'),true);
  f.advance(479);assert.equal(f.nodes['site-content'].inert,true);
  f.advance(1);assert.equal(f.nodes['site-content'].inert,false);assert.equal(f.nodes['hello-intro'].hidden,true);
  assert.equal(f.document.activeElement,f.nodes.main);assert.equal(f.scheduled.size,0);
});
test('Tab reaches skip, overlay clicks stay inert, and Escape exits through the fade',()=>{
  const f=fixture();f.play();
  let prevented=false;f.document.emit('keydown',{key:'Tab',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(f.nodes['site-content'].inert,true);
  assert.equal(f.document.activeElement,f.nodes['hello-skip']);
  f.nodes['hello-intro'].emit('click');assert.equal(f.nodes['site-content'].inert,true);
  f.document.emit('keydown',{key:'Escape',preventDefault(){}});
  assert.equal(f.nodes['hello-intro'].classList.contains('hello-leaving'),true);
  f.advance(480);assert.equal(f.nodes['site-content'].inert,false);
});
test('skip before the first painted frame cancels handwriting and timers and supports replay',()=>{
  const f=fixture();f.controller.play();
  f.nodes['hello-skip'].emit('click');f.nodes['hello-skip'].emit('click');
  f.paint();f.advance(480);
  assert.equal(f.nodes['hello-intro'].hidden,true);assert.equal(f.nodes['site-content'].inert,false);
  assert.equal(f.frames.size,0);assert.equal(f.scheduled.size,0);assert.equal(f.document.activeElement,f.nodes.main);
  assert.equal(f.play(),true);f.advance(3600);f.end();f.advance(980);
  assert.equal(f.nodes['hello-intro'].hidden,true);assert.equal(f.scheduled.size,0);
});
test('completion events from the first stroke or unrelated animations do not end playback',()=>{
  const f=fixture();f.play();
  f.nodes['hello-intro'].emit('animationend',{animationName:'hello-write',target:f.strokes[0]});
  f.nodes['hello-intro'].emit('animationend',{animationName:'other',target:f.strokes[1]});
  f.advance(1000);assert.equal(f.nodes['hello-intro'].classList.contains('hello-leaving'),false);
  f.end();f.end();f.advance(980);assert.equal(f.nodes['site-content'].inert,false);assert.equal(f.scheduled.size,0);
});
test('background time cannot consume the mandatory intro or its fade',()=>{
  const f=fixture();f.play();f.advance(1800);f.visibility(true);f.advance(60000);
  assert.equal(f.nodes['site-content'].inert,true);assert.equal(f.nodes['hello-intro'].classList.contains('hello-paused'),true);
  f.visibility(false);f.advance(1800);f.end();f.advance(500);f.advance(200);f.visibility(true);f.advance(60000);
  assert.equal(f.nodes['site-content'].inert,true);f.visibility(false);f.advance(279);assert.equal(f.nodes['site-content'].inert,true);
  f.advance(1);assert.equal(f.nodes['site-content'].inert,false);
});
test('an initially hidden tab waits until visible, and lost animation events recover after a full visible window',()=>{
  const f=fixture({hidden:true});f.play();f.advance(120000);assert.equal(f.nodes['site-content'].inert,true);
  f.visibility(false);f.advance(5999);assert.equal(f.nodes['hello-intro'].classList.contains('hello-leaving'),false);
  f.advance(1);assert.equal(f.nodes['hello-intro'].classList.contains('hello-complete'),true);
  f.advance(480);assert.equal(f.nodes['site-content'].inert,false);assert.equal(f.scheduled.size,0);
});
test('replays and BFCache restarts always show a full intro without stale callbacks',()=>{
  const f=fixture();const trigger=f.nodes.main;trigger.focus();f.play();f.advance(3600);f.end();f.advance(980);
  assert.equal(f.document.activeElement,trigger);assert.equal(f.play(),true);
  f.advance(2000);assert.equal(f.play({restart:true}),true);f.advance(4000);
  assert.equal(f.nodes['site-content'].inert,true);assert.equal(f.nodes['hello-intro'].classList.contains('hello-leaving'),false);
  f.advance(2480);assert.equal(f.nodes['site-content'].inert,false);
});
test('the self-contained controller can execute inline without module or storage dependencies',()=>{
  const f=fixture();
  runInNewContext(`const controller=(${createHelloController.toString()})({document});controller.play();`,{
    document:f.document,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},Date,
  });
  assert.equal(f.nodes['site-content'].inert,true);assert.equal(f.nodes['hello-intro'].classList.contains('hello-playing'),true);
});

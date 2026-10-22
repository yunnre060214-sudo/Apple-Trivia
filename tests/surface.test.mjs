import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountSurfacePointer} from '../assets/surface.mjs';

function emitter(extra={}) {
  const listeners=new Map();
  return {...extra,listeners,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},emit(type,event={}){listeners.get(type)?.forEach(fn=>fn(event));}};
}
function fixture({tilt=false}={}) {
  const frames=new Map(),styles=new Map(),hover=emitter({matches:true}),reduce=emitter({matches:false});let id=0,reads=0,now=0;
  const node={isConnected:true,disabled:false,dataset:{},style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)},closest:()=>null,getBoundingClientRect(){reads++;return {left:100,top:50,width:200,height:100};}};
  const target={closest:()=>node},root=emitter({isConnected:true,contains:n=>n===node}),document=emitter({hidden:false});
  const window=emitter({performance:{now:()=>now},matchMedia:q=>q.includes('reduced')?reduce:hover,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  const dispose=mountSurfacePointer(root,{document,window,tilt});
  const move=(x=200,y=100,pointerType='mouse')=>root.emit('pointermove',{target,clientX:x,clientY:y,pointerType});
  const paint=(delta=1000/60)=>{now+=delta;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));};
  const settle=()=>{for(let i=0;i<120&&frames.size;i++)paint();assert.equal(frames.size,0,'a surface must converge and stop its frame pump');};
  return {node,root,document,window,hover,reduce,frames,styles,move,paint,settle,dispose,get reads(){return reads;}};
}

test('pointer bursts coalesce, damp toward bounded poses, then stop their frame loop',()=>{
  const f=fixture({tilt:true});for(let i=0;i<20;i++)f.move(200+i,100+i);
  assert.equal(f.frames.size,1);assert.equal(f.reads,1);f.paint();
  assert.ok(parseFloat(f.styles.get('--spot-x'))>50&&parseFloat(f.styles.get('--spot-x'))<59.5);f.settle();
  assert.equal(f.styles.get('--spot-x'),'59.50%');assert.equal(f.node.dataset.surfaceActive,'');
  f.move(900,-200);f.settle();assert.equal(f.styles.get('--spot-x'),'100.00%');assert.equal(f.styles.get('--spot-y'),'0.00%');
  assert.equal(f.styles.get('--card-rx'),'2.50deg');assert.equal(f.styles.get('--card-ry'),'3.50deg');
  f.root.emit('pointerleave');assert.equal(f.styles.get('--card-ry'),'3.50deg');f.paint();
  assert.ok(parseFloat(f.styles.get('--card-ry'))>0&&parseFloat(f.styles.get('--card-ry'))<3.5);
  f.settle();assert.equal(f.styles.size,0);assert.equal(f.node.dataset.surfaceActive,undefined);f.dispose();
});
test('60 Hz and 120 Hz have the same response over the same elapsed time',()=>{
  const a=fixture({tilt:true}),b=fixture({tilt:true});a.move(300,50);b.move(300,50);
  for(let i=0;i<12;i++)a.paint(1000/60);for(let i=0;i<24;i++)b.paint(1000/120);
  assert.ok(Math.abs(parseFloat(a.styles.get('--card-ry'))-parseFloat(b.styles.get('--card-ry')))<.02);
  assert.ok(Math.abs(parseFloat(a.styles.get('--surface-light'))-parseFloat(b.styles.get('--surface-light')))<.002);
  a.dispose();b.dispose();
});
test('reentering during the return preserves the current pose without snapping',()=>{
  const f=fixture({tilt:true});f.move(300,50);f.settle();f.root.emit('pointerleave');f.paint();
  const pose=f.styles.get('--card-ry');f.move(300,50);assert.equal(f.styles.get('--card-ry'),pose);
  f.paint();assert.ok(parseFloat(f.styles.get('--card-ry'))>parseFloat(pose));f.settle();assert.equal(f.styles.get('--card-ry'),'3.50deg');f.dispose();
});
test('touch, reduced motion, coarse pointers and disabled answers keep static surfaces',()=>{
  const f=fixture();f.move(200,100,'touch');assert.equal(f.frames.size,0);
  f.hover.matches=false;f.move();assert.equal(f.frames.size,0);
  f.hover.matches=true;f.reduce.matches=true;f.move();assert.equal(f.frames.size,0);
  f.reduce.matches=false;f.node.disabled=true;f.move();assert.equal(f.frames.size,0);
  f.node.disabled=false;f.move();f.node.disabled=true;f.paint();assert.equal(f.styles.size,0);f.dispose();
});
test('scroll, preference changes, detached nodes and disposal cancel pending work and clear styles',()=>{
  const f=fixture({tilt:true});f.move();f.document.emit('scroll');assert.equal(f.frames.size,0);
  f.move();f.paint();f.reduce.matches=true;f.reduce.emit('change');assert.equal(f.styles.size,0);
  f.reduce.matches=false;f.move();f.node.isConnected=false;f.paint();assert.equal(f.styles.size,0);
  f.node.isConnected=true;f.move();f.dispose();assert.equal(f.frames.size,0);
  for(const source of [f.root,f.document,f.window,f.hover,f.reduce])assert.ok([...source.listeners.values()].every(set=>set.size===0));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animateScore} from '../assets/score.mjs';

function fixture(value=99.8){
  const frames=new Map(),styles=new Map();let id=0,time=0,reduce=false,completed=0;
  const el={textContent:'',isConnected:true,style:{minWidth:'',setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)},getBoundingClientRect:()=>({width:222})};
  const window={performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
  const stop=animateScore(el,value,{window,reducedMotion:()=>reduce,onComplete:()=>completed++});
  const tick=delta=>{time+=delta;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(time));};
  return {el,styles,frames,stop,tick,get completed(){return completed;},reduce(){reduce=true;}};
}
test('fractional scores keep their precision, never show a false perfect score, and finish once',()=>{
  const f=fixture();let previous=0;
  assert.equal(f.el.style.minWidth,'222px');
  for(let i=0;i<16;i++){
    f.tick(50);const value=Number(f.el.textContent);assert.ok(value>=previous&&value<=99.8);previous=value;
    assert.ok(Number(f.styles.get('--score-weight'))>=350&&Number(f.styles.get('--score-weight'))<=620);
    assert.equal(f.el.style.minWidth,'222px');
  }
  f.tick(50);assert.equal(f.el.textContent,'99.8');assert.equal(f.el.style.minWidth,'');assert.equal(f.styles.size,0);assert.equal(f.frames.size,0);assert.equal(f.completed,1);
  f.stop();f.tick(1000);assert.equal(f.completed,1);
});
test('navigation and live reduced motion cancel counting, restore the result and skip the flourish',()=>{
  const f=fixture(80);f.tick(100);f.stop();assert.equal(f.frames.size,0);assert.equal(f.el.textContent,'80');assert.equal(f.completed,0);assert.equal(f.styles.size,0);
  const r=fixture(60);r.tick(100);r.reduce();r.tick(16);assert.equal(r.el.textContent,'60');assert.equal(r.frames.size,0);assert.equal(r.completed,0);
  const d=fixture();d.el.isConnected=false;d.tick(16);assert.equal(d.frames.size,0);assert.equal(d.completed,0);
});

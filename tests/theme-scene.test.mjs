import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createThemeScene} from '../assets/theme-scene.mjs';

const SVG='http://www.w3.org/2000/svg';
class Node {
  constructor(tag,namespaceURI='html') {
    this.tag=tag;this.namespaceURI=namespaceURI;this.attrs=new Map();this.dataset={};this.children=[];this.animations=[];
    this.style={setProperty(k,v){this[k]=v;},getPropertyValue(k){return this[k]||'';}};
    this.classList={add:(...names)=>this.className=[this.className,...names].filter(Boolean).join(' ')};
  }
  get id(){return this.attrs.get('id')||'';} set id(v){this.attrs.set('id',v);}
  get attributes(){return [...this.attrs].map(([name,value])=>({name,value}));}
  setAttribute(k,v){this.attrs.set(k,String(v));} removeAttribute(k){this.attrs.delete(k);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  matches(selectors){return selectors.split(',').some(s=>s===this.tag||(s.startsWith('.')&&this.className?.split(' ').includes(s.slice(1)))||(s==='[tabindex]'&&this.attrs.has('tabindex'))||s===`[data-theme-copy-id="${this.dataset.themeCopyId}"]`);}
  querySelectorAll(selector){return this.children.flatMap(n=>[...(selector==='*'||n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
  cloneNode(){const node=new Node(this.tag,this.namespaceURI);node.attrs=new Map(this.attrs);node.dataset={...this.dataset};node.className=this.className;Object.assign(node.style,this.style);node.innerHTML=this.innerHTML;node.append(...this.children.map(n=>n.cloneNode()));node.animations=this.animations.map(a=>({...a,effect:{target:node}}));return node;}
  getAnimations(){return [...this.animations,...this.children.flatMap(n=>n.getAnimations())];}
  animate(keyframes,options){let resolve,reject;const animation={keyframes,options,effect:{target:this},finished:new Promise((ok,no)=>{resolve=ok;reject=no;}),cancel(){this.cancelled=true;reject(Error('cancelled'));},finish:()=>resolve()};this.animations.push(animation);return animation;}
}
function fixture() {
  const body=new Node('body'),source=new Node('div');source.id='site-content';body.append(source);
  const button=new Node('button');button.id='theme-toggle';button.innerHTML='<svg>moon</svg>';source.append(button);
  const svg=new Node('svg',SVG),gradient=new Node('linearGradient',SVG),path=new Node('path',SVG);gradient.id='home-flow';path.setAttribute('stroke','url(#home-flow)');svg.append(gradient,path);source.append(svg);
  const product=new Node('img');source.append(product);
  product.animations=[{animationName:'home-object-float',effect:{target:product},startTime:-600,currentTime:2500,playState:'running',playbackRate:1,play(){this.playing=true;},pause(){this.paused=true;},cancel(){this.cancelled=true;}}];
  const dialog=new Node('dialog');dialog.id='modal';source.append(dialog);
  const document={body,documentElement:{clientWidth:375},getElementById:id=>[body,...body.querySelectorAll('*')].find(n=>n.id===id),createElement:tag=>new Node(tag),createElementNS:(ns,tag)=>new Node(tag,ns)};
  let time=0,id=0;const frames=new Map();
  const window={scrollY:24,performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key)};
  const scene=createThemeScene({document,window,theme:'dark',width:390,height:844});
  const advance=ms=>{time+=ms;for(const [id,fn]of [...frames]){frames.delete(id);fn(time);}};
  return {scene,body,source,product,button,advance,frames,surface:body.children.find(n=>n.className?.includes('theme-surface'))};
}
test('the alternate scene preserves original animation identity, sanitizes duplicate IDs and keeps SVG paints local',()=>{
  const f=fixture(),copy=f.surface.children[0];f.scene.begin();
  const original=f.product.animations[0],alternate=copy.querySelectorAll('img')[0].animations[0];
  assert.equal(alternate.startTime,original.startTime);assert.equal(alternate.playing,true);assert.equal(original.cancelled,undefined);
  assert.equal(copy.style.width,'375px');assert.equal(copy.style.top,'-24px');assert.equal(copy.querySelectorAll('dialog').length,0);
  const all=[f.body,...f.body.querySelectorAll('*')],ids=all.map(n=>n.id).filter(Boolean);assert.equal(ids.length,new Set(ids).size);
  const gradient=copy.querySelectorAll('linearGradient')[0],path=copy.querySelectorAll('path')[0];assert.equal(path.attrs.get('stroke'),`url(#${gradient.id})`);
  assert.equal(f.surface.inert,true);assert.equal(f.surface.attrs.get('aria-hidden'),'true');
  f.scene.dispose();assert.equal(f.body.children.length,1);assert.equal(alternate.cancelled,true);assert.equal(original.cancelled,undefined);
});
test('compound circles reveal and erase through one clip path without allocating DOM nodes',async()=>{
  const f=fixture(),before=f.surface.querySelectorAll('*').length;
  const a=f.scene.addWave({x:342,y:40,radius:950,show:true}),b=f.scene.addWave({x:342,y:40,radius:950,show:false});
  assert.equal(f.surface.querySelectorAll('*').length,before);
  assert.equal(f.body.querySelectorAll('circle').length,0);
  assert.equal(f.frames.size,1);f.advance(390);
  assert.match(f.surface.style.clipPath,/path\(evenodd/);
  assert.equal((f.surface.style.clipPath.match(/A/g)||[]).length,4);
  assert.match(f.surface.style.clipPath,/831\.25/);
  assert.equal(f.frames.size,1);
  f.scene.setFloor(true);assert.match(f.surface.style.clipPath,/M0 0H390V844H0Z/);
  f.advance(390);await Promise.all([a.animation.finished,b.animation.finished]);a.remove();b.remove();f.scene.dispose();
  assert.equal(f.body.children.length,1);assert.equal(f.frames.size,0);
});

test('twenty mask circles use one frame pump and cancellation releases the last scheduled callback',async()=>{
  const f=fixture(),waves=Array.from({length:20},(_,i)=>f.scene.addWave({x:342,y:40,radius:950,show:i%2===0}));
  assert.equal(f.frames.size,1);f.advance(160);assert.equal(f.frames.size,1);
  assert.equal((f.surface.style.clipPath.match(/A/g)||[]).length,40);assert.equal(f.body.querySelectorAll('circle').length,0);
  waves.forEach(wave=>{wave.animation.cancel();wave.remove();});await Promise.all(waves.map(wave=>wave.animation.finished));
  assert.equal(f.frames.size,0);f.scene.dispose();
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInteractionMotion,describeMotion,MOTION_PROFILES} from '../assets/motion.mjs';

class Element {
  constructor(tag='div',classes='') {this.tagName=tag.toUpperCase();this.classes=new Set(classes.split(' ').filter(Boolean));this.dataset={};this.attributes=new Map();this.children=[];this.parentElement=null;this.isConnected=true;this.disabled=false;this.open=false;this.type=tag==='button'?'button':'';this.name='';this.value='';this.id='';this.textContent='';this.animations=[];this.style={setProperty:(k,v)=>{this.style[k]=v;}};this.box={left:0,top:0,width:200,height:44};this.scrollLeft=0;this.scrollTop=0;this.classList={contains:c=>this.classes.has(c),add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x))};}
  get parentNode(){return this.parentElement;}
  get className(){return [...this.classes].join(' ');}
  set className(value){this.classes=new Set(value.split(' ').filter(Boolean));}
  getAttribute(name){if(name==='class')return [...this.classes].join(' ');if(name.startsWith('data-'))return this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return this.attributes.get(name)??null;}
  setAttribute(name,value){if(name==='class')this.classes=new Set(value.split(' '));else if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);else this.attributes.set(name,String(value));}
  toggleAttribute(name,force){const enabled=force??this.getAttribute(name)===null;if(enabled)this.setAttribute(name,'');else if(name.startsWith('data-'))delete this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];else this.attributes.delete(name);return enabled;}
  matches(selector){return selector.split(',').some(raw=>{let s=raw.trim();if(s===':focus-visible')return !!this.focusVisible;if(s.includes(' '))s=s.split(' ').at(-1);if(s.includes('>'))s=s.split('>').at(-1);if(s.includes(':not([type=hidden])')){if(this.type==='hidden')return false;s=s.replace(':not([type=hidden])','');}const tag=s.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;for(const c of s.matchAll(/\.([\w-]+)/g))if(!this.classes.has(c[1]))return false;const id=s.match(/#([\w-]+)/)?.[1];if(id&&id!==this.id)return false;for(const m of s.matchAll(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/g)){const value=m[1]==='type'?this.type:this.getAttribute(m[1]);if(value===null||value===undefined||(m[2]!==undefined&&String(value)!==m[2]))return false;}return true;});}
  closest(s){for(let el=this;el;el=el.parentElement)if(el.matches(s))return el;return null;}
  querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  append(...children){for(const child of children){child.detach();child.parentElement=this;this.children.push(child);}}
  prepend(child){child.detach();child.parentElement=this;this.children.unshift(child);}
  before(child){const parent=this.parentElement,index=parent.children.indexOf(this);child.detach();child.parentElement=parent;parent.children.splice(index,0,child);}
  detach(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);}this.parentElement=null;}
  replaceWith(other){this.before(other);this.detach();this.isConnected=false;}
  contains(el){return this===el||this.children.some(c=>c.contains(el));}
  getBoundingClientRect(){return {...this.box,height:this.tagName==='DETAILS'?(this.open?170:50):this.box.height};}
  close(){this.open=false;this.closed=(this.closed||0)+1;}
  animate(keyframes,options){let resolve,reject;const animation={keyframes,options,cancelled:false,finished:new Promise((ok,no)=>{resolve=ok;reject=no;}),finish(){resolve();},cancel(){this.cancelled=true;reject(Error('cancelled'));}};this.animations.push(animation);return animation;}
}
function fixture({reduce=false}={}) {
  const events=new Map(),windowEvents=new Map(),timers=new Map();let next=0,mutations;
  const root=new Element('html'),body=new Element('body');root.append(body);
  const document={documentElement:root,body,hidden:false,querySelectorAll:s=>body.querySelectorAll(s),createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener:(type,fn)=>events.get(type)?.delete(fn)};
  const preference={matches:reduce,addEventListener(type,fn){this.fn=fn;},removeEventListener(){this.fn=null;}};
  const window={getComputedStyle:()=>({scale:'1',translate:'0px 0px',rotate:'0deg'}),matchMedia:q=>q.includes('prefers-reduced-motion')?preference:{matches:true},setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),addEventListener:(type,fn)=>{windowEvents.set(type,fn);},removeEventListener:type=>windowEvents.delete(type),MutationObserver:class{constructor(callback){mutations=callback;}observe(){}disconnect(){mutations=null;}}};
  const append=(tag,classes='',data={},parent=body)=>{const el=new Element(tag,classes);Object.assign(el.dataset,data);parent.append(el);return el;};
  const emit=(type,target,extra={})=>{let prevented=false;const event={target,button:0,isPrimary:true,pointerId:1,clientX:10,clientY:10,key:'',preventDefault(){prevented=true;},...extra};events.get(type)?.forEach(fn=>fn(event));return prevented;};
  const mount=()=>createInteractionMotion({document,window,reducedMotion:()=>preference.matches});
  return {root,body,document,window,preference,append,emit,mount,timers,events,windowEvents,mutate:records=>mutations?.(records),tick(){for(const[id,fn]of [...timers]){timers.delete(id);fn();}}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('all current actions have semantic recipes, with separate home, result and navigation variants',()=>{
  const f=fixture();
  const actions=['theme','custom','resume','flag','map','previous','confirm','explain','end-round','finish','results','review','share-card','download','native-share','copy','replay-hello','reload','quick','home','about','next','close'];
  for(const action of actions){const el=f.append('button','',{action}),info=describeMotion(el);assert.notEqual(info.kind,'control',action);assert.ok(MOTION_PROFILES[info.kind]);}
  assert.equal(describeMotion(f.append('button','hero-start',{action:'quick'})).kind,'launch');
  const result=f.append('div','result-actions');assert.equal(describeMotion(f.append('button','',{action:'quick'},result)).kind,'replay');
  assert.equal(describeMotion(f.append('button','quick-next',{action:'next'})).kind,'quick-next');
  assert.equal(describeMotion(f.append('button','modal-close',{action:'close'})).kind,'dismiss');
  const tabs=['mac','imac','ipod','iphone','macbook','ipad','watch','airpods','vision'].map(device=>describeMotion(f.append('button','',{device})));
  assert.equal(new Set(tabs.map(x=>x.id)).size,9);
  assert.ok(Object.keys(MOTION_PROFILES).length>=50);
});

test('every pointer and keyboard contact holds until release and uses a bounded spring',async()=>{
  const f=fixture(),b=f.append('button','hero-start',{action:'quick'}),motion=f.mount();
  let captured=false;b.setPointerCapture=()=>{captured=true;};b.hasPointerCapture=()=>captured;b.releasePointerCapture=()=>{captured=false;};
  f.emit('pointerdown',b);assert.equal(b.dataset.motionPressed,'');const contact=b.animations.at(-1);contact.finish();await flush();assert.equal(contact.cancelled,false);
  assert.equal(captured,true);
  f.emit('pointerup',b);assert.equal(b.dataset.motionPressed,undefined);assert.equal(contact.cancelled,true);const spring=b.animations.at(-1);assert.ok(spring.options.duration<=420);spring.finish();await flush();assert.equal(spring.cancelled,true);
  assert.equal(captured,false);
  f.emit('keydown',b,{key:'Enter'});assert.equal(b.dataset.motionPressed,'');f.emit('keyup',b,{key:'Enter'});assert.equal(b.dataset.motionPressed,undefined);
  motion.dispose();assert.ok([...f.events.values()].every(s=>s.size===0));
});

test('touch scrolling cancels contact without overshoot; secondary, disabled and inert controls stay still',()=>{
  const f=fixture(),b=f.append('button','',{action:'custom'}),motion=f.mount();
  f.emit('pointerdown',b);f.emit('pointermove',b,{clientX:40});assert.equal(b.dataset.motionPressed,undefined);assert.equal(b.animations.at(-1).options.duration,160);
  const count=b.animations.length;f.emit('pointerdown',b,{button:2});b.disabled=true;f.emit('pointerdown',b);assert.equal(b.animations.length,count);
  b.disabled=false;f.body.setAttribute('inert','');f.emit('pointerdown',b);assert.equal(b.animations.length,count);motion.dispose();
});

test('segments own one traveling highlight, preserve layout and respond to selection changes',()=>{
  const f=fixture(),group=f.append('div','segments'),a=f.append('button','',{count:'5'},group),b=f.append('button','',{count:'10'},group);
  a.setAttribute('aria-pressed','true');a.box={left:4,top:4,width:50,height:44};b.setAttribute('aria-pressed','false');b.box={left:58,top:4,width:50,height:44};
  const motion=f.mount(),marker=group.querySelector('.motion-segment');assert.ok(marker);assert.equal(group.children.filter(x=>x.classes.has('motion-segment')).length,1);
  motion.activate(b);assert.equal(marker.style.left,'58px');assert.ok(marker.animations.at(-1).keyframes[0].transform.includes('translate'));
  a.setAttribute('aria-pressed','false');b.setAttribute('aria-pressed','true');f.mutate([{type:'attributes',target:a},{type:'attributes',target:b}]);assert.equal(marker.dataset.selected,'10');assert.equal(marker.animations.length,1);motion.dispose();
});

test('native selects are wrapped once, preserve the original control, and close the indicator on change or Escape',()=>{
  const f=fixture(),label=f.append('label'),select=f.append('select','',{},label);select.name='mode';const motion=f.mount();motion.refresh();
  assert.equal(label.querySelectorAll('select').length,1);assert.equal(label.querySelectorAll('.motion-select').length,1);
  f.emit('pointerdown',select);assert.equal(select.parentElement.getAttribute('data-open'),'');f.emit('change',select);assert.equal(select.parentElement.getAttribute('data-open'),null);
  f.emit('keydown',select,{key:'ArrowDown'});assert.equal(select.parentElement.getAttribute('data-open'),'');f.emit('keydown',select,{key:'Escape'});assert.equal(select.parentElement.getAttribute('data-open'),null);motion.dispose();
});

test('dialog exits preserve native close behavior and reopening cancels a pending exit',async()=>{
  const f=fixture(),dialog=f.append('dialog'),motion=f.mount();dialog.open=true;
  motion.closeDialog(dialog);assert.equal(dialog.open,true);const exit=dialog.animations.at(-1);motion.closeDialog(dialog);assert.equal(dialog.animations.length,1);
  motion.prepareDialog(dialog);exit.finish();await flush();assert.equal(dialog.open,true);assert.equal(dialog.dataset.motionClosing,undefined);
  motion.closeDialog(dialog);dialog.animations.at(-1).finish();await flush();assert.equal(dialog.open,false);assert.equal(dialog.closed,1);
  dialog.open=true;assert.equal(f.emit('cancel',dialog),true);dialog.animations.at(-1).finish();await flush();assert.equal(dialog.closed,2);motion.dispose();
});

test('disclosures reverse cleanly and restore intrinsic height when reduced motion is enabled',async()=>{
  const f=fixture(),details=f.append('details','review-item'),summary=f.append('summary','',{},details);summary.box.height=49;f.append('div','review-body',{},details);const motion=f.mount();
  assert.equal(f.emit('click',summary),true);assert.equal(details.open,true);const first=details.animations.at(-1);
  f.emit('click',summary);assert.equal(first.cancelled,true);const close=details.animations.at(-1);close.finish();await flush();assert.equal(details.open,false);assert.equal(details.dataset.motionDisclosing,undefined);
  f.emit('click',summary);f.preference.matches=true;f.preference.fn({matches:true});assert.equal(details.open,true);assert.equal(details.dataset.motionDisclosing,undefined);assert.equal(f.emit('click',summary),false);motion.dispose();
});

test('completion indicators occur only when requested, restore the exact icon, and never steal focus',()=>{
  const f=fixture(),button=f.append('button','',{action:'copy'}),icon=f.append('svg','icon',{},button),motion=f.mount();
  assert.equal(button.dataset.motionFeedback,undefined);motion.feedback(button);assert.equal(button.dataset.motionFeedback,'success');assert.ok(button.querySelector('.motion-status-icon'));assert.equal(f.timers.size,1);
  motion.feedback(button);assert.equal(f.timers.size,1);f.tick();assert.equal(button.querySelector('.icon'),icon);assert.equal(button.dataset.motionFeedback,undefined);
  motion.feedback(button);motion.dispose();assert.equal(f.timers.size,0);assert.equal(button.querySelector('.icon'),icon);
});

test('reduced motion, missing animation APIs and pagehide leave controls usable and no queued work',()=>{
  for(const reduce of [true,false]){
    const f=fixture({reduce}),b=f.append('button','',{action:'custom'}),dialog=f.append('dialog');if(!reduce){b.animate=undefined;dialog.animate=undefined;}
    const motion=f.mount();f.emit('pointerdown',b);f.emit('pointerup',b);assert.equal(b.animations.length,0);dialog.open=true;motion.closeDialog(dialog);assert.equal(dialog.open,false);f.windowEvents.get('pagehide')();assert.equal(b.dataset.motionPressed,undefined);motion.dispose();assert.equal(f.timers.size,0);
  }
});

test('styles constrain hover effects to fine pointers and include a reduced-motion override',async()=>{
  const css=await readFile(new URL('../assets/motion.css',import.meta.url),'utf8');
  assert.match(css,/@media \(hover:hover\) and \(pointer:fine\)/);assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/motion-arrow-back/);assert.match(css,/motion-download/);assert.match(css,/motion-copy-stack/);
  const [interaction,ambient]=css.split('/* Quiet home loops');
  assert.doesNotMatch(interaction,/animation:[^;]+infinite/);
  assert.match(ambient,/@media \(prefers-reduced-motion:no-preference\)/);
});

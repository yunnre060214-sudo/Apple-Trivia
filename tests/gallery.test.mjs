import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveMarkup, devices, mountArchive } from '../assets/gallery.mjs';

test('gallery includes nine chronological, locally drawn product studies', async () => {
  assert.equal(devices.length, 9);
  assert.equal(new Set(devices.map(d => d.id)).size, 9);
  assert.deepEqual(devices.map(d => Number(d.year)), [...devices.map(d => Number(d.year))].sort((a,b) => a-b));
  for (const item of devices) {
    const svg = await readFile(new URL(`../assets/${item.image}`, import.meta.url), 'utf8');
    assert.match(svg, /viewBox="0 0 480 440"/);
    assert.doesNotMatch(svg, /<script|<image|https?:\/\/(?!www\.w3\.org)/);
  }
  const html = archiveMarkup('test');
  assert.equal((html.match(/data-device=/g) || []).length, 9);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/data-archive-layer=/g) || []).length, 9);
  assert.equal((html.match(/data-gallery-question=/g) || []).length, 2);
  assert.match(html, /href="#q=gallery-mac-memory"/);
  assert.match(html, /data-archive-step="-1" aria-label="上一款产品"/);
  assert.match(html, /data-archive-step="1" aria-label="下一款产品"/);
  assert.match(html, /aria-live="polite"/);
});

test('MacBook Air study keeps a 16:10 screen and individually drawn keyboard', async () => {
  const svg = await readFile(new URL('../assets/macbook-air.svg', import.meta.url), 'utf8');
  const display = svg.match(/<rect id="macbook-display"[^>]+width="([\d.]+)" height="([\d.]+)"/);
  assert.ok(display);
  assert.ok(Math.abs(Number(display[1]) / Number(display[2]) - 1.6) < .01);
  const keyboard = svg.match(/<g id="keyboard"[^>]+>([\s\S]+?)<\/g>/);
  assert.ok(keyboard);
  assert.ok((keyboard[1].match(/<path /g) || []).length >= 60);
  assert.doesNotMatch(keyboard[1], /<pattern/);
});

function fixture() {
  const listeners = new Map(), scrolls = [], caption = {}, focus = [], values = new Map(), scheduled = new Map();
  let time = 0, timerId = 0;
  const clock = {
    setTimer(fn, ms) { scheduled.set(++timerId, {fn, at:time+ms}); return timerId; },
    clearTimer(id) { scheduled.delete(id); },
  };
  const advance = ms => {
    const end = time + ms;
    while (true) {
      const next = [...scheduled].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      time = next[1].at; scheduled.delete(next[0]); next[1].fn();
    }
    time = end;
  };
  const indicator = {style:{setProperty:(key,value) => values.set(key,value)}};
  const playback = {attributes:new Map(), setAttribute(key,value) { this.attributes.set(key,value); }};
  const storyLink={dataset:{},setAttribute(){}};
  const year={dataset:{},firstChild:{textContent:'1984'},setAttribute(){}};
  const date={setAttribute(){}},story={};
  const documentEvents = new Map(), rootClasses = new Set();
  const doc = {hidden:false, documentElement:{classList:{contains:name => rootClasses.has(name)}},
    querySelector:() => null,
    addEventListener:(name,fn) => documentEvents.set(name,fn),
    removeEventListener:name => documentEvents.delete(name),
  };
  const buttons = devices.map((d, index) => ({
    dataset:{device:d.id}, pressed:String(index === 0),
    setAttribute(name,value) { if (name === 'aria-pressed') this.pressed = value; },
    getBoundingClientRect() { return {left:54 + index * 92 - rail.scrollLeft, width:84}; },
    closest(selector) { return selector === '[data-device]' ? this : null; },
    focus(options) { focus.push({id:d.id, options}); },
  }));
  const layers = devices.map((d, index) => {
    const layer = {dataset:{archiveLayer:d.id}, active:index === 0};
    layer.classList = {toggle(name, value) { layer.active = value; }};
    return layer;
  });
  const rail = {
    scrollLeft:0, scrollWidth:824, clientWidth:220,
    getBoundingClientRect:() => ({left:54, width:220}),
    scrollTo(options) { scrolls.push(options); this.scrollLeft = options.left; },
  };
  const figure = {
    isConnected:true, ownerDocument:doc, dataset:{},
    style:{setProperty:(key,value)=>values.set(key,value)},
    contains:target => buttons.includes(target),
    querySelectorAll:selector => ({'[data-device]':buttons,'[data-archive-layer]':layers,'[data-gallery-question]':[year,storyLink]}[selector] || []),
    querySelector:selector => ({'.archive-select':rail,'.archive-indicator':indicator,'[data-archive-playback]':playback,'[data-archive-caption]':caption,'[data-archive-year]':year,'[data-archive-date]':date,'[data-archive-story]':story}[selector] || null),
    addEventListener:(type, fn) => listeners.set(type, fn),
    removeEventListener:(type, fn) => { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  const click = target => listeners.get('click')({target});
  const step = n => click({dataset:{archiveStep:String(n)}, closest:selector => selector === '[data-archive-step]' ? {dataset:{archiveStep:String(n)}} : null});
  const key = (id, name, modifiers = {}) => {
    let prevented = false;
    listeners.get('keydown')({target:buttons.find(b => b.dataset.device === id), key:name, preventDefault:() => { prevented = true; }, ...modifiers});
    return prevented;
  };
  return {figure, buttons, layers, rail, caption, focus, scrolls, listeners, click, step, key, values, clock, advance, scheduled, playback, year, date, story, storyLink, doc, documentEvents, rootClasses};
}

test('gallery arrows wrap, keys retain focus, and scrolling is confined to the product rail', () => {
  const originalMatch = globalThis.matchMedia, originalCancel = globalThis.cancelAnimationFrame;
  globalThis.matchMedia = () => ({matches:false});
  globalThis.cancelAnimationFrame = () => {};
  try {
    const f = fixture();
    const cleanup = mountArchive(f.figure, {reducedMotion:() => true});
    const expect = id => {
      assert.deepEqual(f.layers.filter(l => l.active).map(l => l.dataset.archiveLayer), [id]);
      assert.deepEqual(f.buttons.filter(b => b.pressed === 'true').map(b => b.dataset.device), [id]);
      const d = devices.find(item => item.id === id);
      assert.equal(f.caption.textContent, `${d.name}，${d.year} 年`);
    };
    f.step(-1); expect('vision'); assert.equal(f.rail.scrollLeft, 604);
    f.step(1); expect('mac'); assert.equal(f.rail.scrollLeft, 0);
    for (const button of f.buttons) { f.click(button); expect(button.dataset.device); }
    assert.equal(f.key('vision', 'ArrowRight'), true); expect('mac');
    assert.deepEqual(f.focus.at(-1), {id:'mac', options:{preventScroll:true}});
    f.key('mac', 'End'); expect('vision');
    f.key('vision', 'Home'); expect('mac');
    f.key('mac', 'ArrowLeft'); expect('vision');
    assert.equal(f.key('vision', 'ArrowLeft', {altKey:true}), false); expect('vision');
    assert.equal(f.key('vision', 'Tab'), false); expect('vision');
    assert.ok(f.scrolls.every(s => s.behavior === 'auto' && s.left >= 0 && s.left <= 604 && !('top' in s)));
    cleanup(); assert.equal(f.listeners.size, 0);
  } finally {
    if (originalMatch === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = originalMatch;
    if (originalCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = originalCancel;
  }
});

test('gallery uses smooth horizontal scrolling unless reduced motion is requested', () => {
  const originalMatch = globalThis.matchMedia, originalCancel = globalThis.cancelAnimationFrame;
  globalThis.matchMedia = () => ({matches:false});
  globalThis.cancelAnimationFrame = () => {};
  try {
    const f = fixture(), cleanup = mountArchive(f.figure);
    f.step(1);
    assert.equal(f.scrolls[0].behavior, 'smooth');
    cleanup();
    assert.equal(typeof mountArchive(null), 'function');
  } finally {
    if (originalMatch === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = originalMatch;
    if (originalCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = originalCancel;
  }
});

test('autoplay wraps, manual selection resets its interval, and one indicator follows the selection', () => {
  const previous = {match:globalThis.matchMedia,cancel:globalThis.cancelAnimationFrame};
  globalThis.matchMedia = () => ({matches:false});globalThis.cancelAnimationFrame = () => {};
  try {
    const f=fixture(),cleanup=mountArchive(f.figure,{...f.clock});
    const active=()=>f.buttons.find(b=>b.pressed==='true').dataset.device;
    assert.equal(f.scheduled.size,1);f.advance(4999);assert.equal(active(),'mac');
    f.advance(1);assert.equal(active(),'imac');assert.equal(f.values.get('--indicator-x'),'122px');
    f.advance(2500);f.click(f.buttons[7]);assert.equal(active(),'airpods');
    assert.equal(f.year.firstChild.textContent,'2016');assert.equal(f.date.textContent,'2016.9.7');
    assert.equal(f.storyLink.dataset.galleryQuestion,'gallery-airpods-w1');
    f.advance(4999);assert.equal(active(),'airpods');f.advance(1);assert.equal(active(),'vision');
    f.advance(5000);assert.equal(active(),'mac');assert.equal(f.values.get('--indicator-x'),'30px');
    cleanup();assert.equal(f.scheduled.size,0);assert.equal(f.listeners.size,0);assert.equal(f.documentEvents.size,0);
    f.advance(20000);assert.equal(active(),'mac');
  } finally {globalThis.matchMedia=previous.match;globalThis.cancelAnimationFrame=previous.cancel;}
});

test('autoplay pauses for hover, keyboard, hidden pages and user pause without losing manual navigation', () => {
  const previous = {match:globalThis.matchMedia,cancel:globalThis.cancelAnimationFrame};
  globalThis.matchMedia = () => ({matches:false});globalThis.cancelAnimationFrame = () => {};
  try {
    const f=fixture(),cleanup=mountArchive(f.figure,{...f.clock});
    f.listeners.get('pointerenter')({pointerType:'mouse'});f.advance(10000);
    assert.equal(f.buttons[0].pressed,'true');assert.equal(f.scheduled.size,0);
    f.listeners.get('pointerleave')();
    f.listeners.get('focusin')({target:{matches:()=>true}});f.advance(10000);assert.equal(f.buttons[0].pressed,'true');
    f.key('mac','ArrowRight');assert.equal(f.buttons[1].pressed,'true');
    f.listeners.get('focusout')({relatedTarget:null});
    f.doc.hidden=true;f.documentEvents.get('visibilitychange')();assert.equal(f.scheduled.size,0);
    f.doc.hidden=false;f.documentEvents.get('visibilitychange')();
    f.click({closest:selector=>selector==='[data-archive-playback]'?f.playback:null});
    assert.equal(f.playback.attributes.get('aria-pressed'),'true');assert.equal(f.scheduled.size,0);
    f.click({closest:selector=>selector==='[data-archive-playback]'?f.playback:null});
    assert.equal(f.playback.attributes.get('aria-pressed'),'false');f.advance(5000);assert.equal(f.buttons[2].pressed,'true');
    cleanup();
    const reduced=fixture(),stop=mountArchive(reduced.figure,{...reduced.clock,reducedMotion:()=>true});
    assert.equal(reduced.scheduled.size,0);reduced.step(1);assert.equal(reduced.buttons[1].pressed,'true');stop();
  } finally {globalThis.matchMedia=previous.match;globalThis.cancelAnimationFrame=previous.cancel;}
});

test('touch drags released outside the gallery or interrupted by backgrounding cannot permanently pause autoplay',()=>{
  const previous={match:globalThis.matchMedia,cancel:globalThis.cancelAnimationFrame};
  globalThis.matchMedia=()=>({matches:false});globalThis.cancelAnimationFrame=()=>{};
  try {
    const f=fixture(),cleanup=mountArchive(f.figure,{...f.clock});
    f.listeners.get('pointerdown')({pointerType:'touch',pointerId:4});assert.equal(f.scheduled.size,0);
    f.documentEvents.get('pointerup')({pointerId:99});assert.equal(f.scheduled.size,0);
    f.documentEvents.get('pointerup')({pointerId:4});assert.equal(f.scheduled.size,1);
    f.advance(5000);assert.equal(f.buttons[1].pressed,'true');
    f.listeners.get('pointerdown')({pointerType:'touch',pointerId:5});
    f.doc.hidden=true;f.documentEvents.get('visibilitychange')();
    f.doc.hidden=false;f.documentEvents.get('visibilitychange')();
    f.advance(5000);assert.equal(f.buttons[2].pressed,'true');
    cleanup();assert.equal(f.documentEvents.size,0);assert.equal(f.scheduled.size,0);
  } finally {globalThis.matchMedia=previous.match;globalThis.cancelAnimationFrame=previous.cancel;}
});
test('enabling reduced motion resets the artwork pose immediately and clears autoplay',()=>{
  const previous={match:globalThis.matchMedia,cancel:globalThis.cancelAnimationFrame};
  const preference={matches:false,addEventListener:(_,fn)=>preference.change=fn,removeEventListener:()=>preference.change=null};
  globalThis.matchMedia=()=>preference;globalThis.cancelAnimationFrame=()=>{};
  try {
    const f=fixture(),cleanup=mountArchive(f.figure,{...f.clock,reducedMotion:()=>preference.matches});
    preference.matches=true;preference.change();
    assert.equal(f.scheduled.size,0);assert.equal(f.values.get('--art-x'),'0deg');assert.equal(f.values.get('--art-y'),'0deg');
    preference.matches=false;preference.change();assert.equal(f.scheduled.size,1);cleanup();assert.equal(preference.change,null);
  } finally {globalThis.matchMedia=previous.match;globalThis.cancelAnimationFrame=previous.cancel;}
});

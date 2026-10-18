// Original vector studies of nine Apple silhouettes. No external assets.
export const devices = [
  {id:'mac', name:'Macintosh', year:'1984', image:'macintosh.svg'},
  {id:'imac', name:'iMac G3', year:'1998', image:'imac-g3.svg'},
  {id:'ipod', name:'iPod', year:'2004', image:'ipod.svg'},
  {id:'iphone', name:'iPhone', year:'2007', image:'iphone.svg'},
  {id:'macbook', name:'MacBook Air', year:'2008', image:'macbook-air.svg'},
  {id:'ipad', name:'iPad', year:'2010', image:'ipad.svg'},
  {id:'watch', name:'Apple Watch', year:'2015', image:'apple-watch.svg'},
  {id:'airpods', name:'AirPods', year:'2016', image:'airpods.svg'},
  {id:'vision', name:'Vision Pro', year:'2024', image:'vision-pro.svg'},
];

export function archiveMarkup(version) {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return `<figure class="archive" aria-label="Apple 经典产品"><div class="archive-stage">${devices.map((d,i)=>`<div class="archive-layer ${i===0?'is-active':''}" data-archive-layer="${d.id}" aria-hidden="true"><span class="archive-year">${d.year}</span><div class="archive-object"><img src="./assets/${d.image}?v=${version}" width="480" height="440" alt="" draggable="false" decoding="async" fetchpriority="${i===0?'high':'low'}"></div></div>`).join('')}</div><div class="archive-controls"><button type="button" class="archive-arrow" data-archive-step="-1" aria-label="上一款产品">${arrow}</button><div class="archive-select" role="group" aria-label="切换展陈产品，可横向滑动"><div class="archive-select-track">${devices.map((d,i)=>`<button type="button" data-device="${d.id}" aria-pressed="${i===0}"><span>${d.name}</span></button>`).join('')}<i class="archive-indicator" aria-hidden="true"></i></div></div><button type="button" class="archive-arrow" data-archive-step="1" aria-label="下一款产品">${arrow}</button><button type="button" class="archive-playback" data-archive-playback aria-label="暂停自动切换" aria-pressed="false"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path class="archive-pause-icon" d="M7 5v10m6-10v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path class="archive-play-icon" d="m7 4 8 6-8 6V4Z" fill="currentColor"/></svg></button></div><figcaption class="sr-only" aria-live="polite" data-archive-caption>Macintosh，1984 年</figcaption></figure>`;
}

export function mountArchive(figure, {reducedMotion = () => false, setTimer = setTimeout, clearTimer = clearTimeout, interval = 5000} = {}) {
  if (!figure) return () => {};
  const buttons = [...figure.querySelectorAll('[data-device]')];
  const rail = figure.querySelector('.archive-select');
  const indicator = figure.querySelector('.archive-indicator');
  const playback = figure.querySelector('[data-archive-playback]');
  const doc = figure.ownerDocument;
  const pauses = new Set();
  let timer, disposed = false, userPaused = false;
  let active = 'mac', frame, previous = 0;
  let targetX = 0, targetY = 0, x = 0, y = 0;
  const reset = () => {
    if (!targetX && !targetY && !x && !y) return;
    targetX = 0; targetY = 0; schedule();
  };
  const media = matchMedia('(hover: hover) and (pointer: fine)');
  function scheduleAuto() {
    clearTimer(timer);
    const stopped = userPaused || reducedMotion() || pauses.size > 0;
    figure.dataset && (figure.dataset.paused = String(stopped));
    if (stopped || disposed) return;
    timer = setTimer(() => {
      if (!figure.isConnected) return;
      show(devices.findIndex(d => d.id === active) + 1, false);
      scheduleAuto();
    }, interval);
  }
  function pause(reason, value) {
    if (value) pauses.add(reason); else pauses.delete(reason);
    scheduleAuto();
  }
  function syncVisibility() {
    pause('hidden', Boolean(doc?.hidden));
    pause('intro', Boolean(doc?.documentElement.classList.contains('hello-pending')));
    pause('dialog', Boolean(doc?.querySelector('dialog[open]')));
  }
  function positionIndicator() {
    if (!indicator) return;
    const button = buttons[devices.findIndex(d => d.id === active)];
    const bounds = rail.getBoundingClientRect(), target = button.getBoundingClientRect();
    indicator.style.setProperty('--indicator-x', `${rail.scrollLeft + target.left - bounds.left + (target.width - 24) / 2}px`);
  }
  function tick(now) {
    frame = undefined;
    if (!figure.isConnected) return;
    const amount = 1 - Math.exp(-Math.min(32, now - (previous || now - 16)) / 70);
    previous = now;
    x += (targetX - x) * amount;
    y += (targetY - y) * amount;
    figure.style.setProperty('--art-x', `${x.toFixed(3)}deg`);
    figure.style.setProperty('--art-y', `${y.toFixed(3)}deg`);
    if (Math.abs(targetX-x)+Math.abs(targetY-y) > .015) schedule();
    else previous = 0;
  }
  function schedule() { if (frame === undefined) frame = requestAnimationFrame(tick); }
  function move(event) {
    if (!media.matches || reducedMotion() || event.pointerType === 'touch') return;
    const b = figure.getBoundingClientRect();
    targetX = ((event.clientY-b.top)/b.height-.5)*-5;
    targetY = ((event.clientX-b.left)/b.width-.5)*5;
    schedule();
  }
  function show(index, manual = true) {
    const normalized = (index + devices.length) % devices.length;
    const item = devices[normalized], button = buttons[normalized];
    active = item.id;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    figure.querySelectorAll('[data-archive-layer]').forEach(layer => layer.classList.toggle('is-active', layer.dataset.archiveLayer === active));
    const caption = figure.querySelector('[data-archive-caption]');
    // Automatic updates stay quiet for screen readers.
    caption.setAttribute?.('aria-live', manual ? 'polite' : 'off');
    caption.textContent = `${item.name}，${item.year} 年`;
    positionIndicator();
    // Scroll this rail only. scrollIntoView could also move the whole page.
    const bounds = rail.getBoundingClientRect(), target = button.getBoundingClientRect();
    const left = rail.scrollLeft + target.left - bounds.left - (bounds.width - target.width) / 2;
    rail.scrollTo({left:Math.max(0, Math.min(left, rail.scrollWidth - rail.clientWidth)), behavior:reducedMotion()?'auto':'smooth'});
    if (manual) scheduleAuto();
  }
  function select(event) {
    if (event.target.closest('[data-archive-playback]')) {
      userPaused = !userPaused;
      playback.setAttribute('aria-pressed', String(userPaused));
      playback.setAttribute('aria-label', userPaused ? '继续自动切换' : '暂停自动切换');
      scheduleAuto();
      return;
    }
    const step = event.target.closest('[data-archive-step]');
    if (step) return show(devices.findIndex(d => d.id === active) + Number(step.dataset.archiveStep));
    const button = event.target.closest('[data-device]');
    const index = devices.findIndex(d => d.id === button?.dataset.device);
    if (index !== -1) show(index);
  }
  const onEnter = event => { if (event.pointerType !== 'touch') pause('hover', true); };
  const onLeave = () => { reset(); pause('hover', false); };
  const onFocus = event => pause('focus', event.target.matches?.(':focus-visible') ?? true);
  const onBlur = event => { if (!figure.contains(event.relatedTarget)) pause('focus', false); };
  const onTouchStart = event => { if (event.pointerType === 'touch') pause('touch', true); };
  const onTouchEnd = () => pause('touch', false);
  function keydown(event) {
    const button = event.target.closest('[data-device]');
    if (!button || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = buttons.indexOf(button);
    const next = {ArrowLeft:index-1, ArrowRight:index+1, Home:0, End:devices.length-1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    show(next);
    buttons[(next + devices.length) % devices.length].focus({preventScroll:true});
  }
  figure.addEventListener('click', select);
  figure.addEventListener('keydown', keydown);
  figure.addEventListener('pointermove', move);
  figure.addEventListener('pointerenter', onEnter);
  figure.addEventListener('pointerleave', onLeave);
  figure.addEventListener('focusin', onFocus);
  figure.addEventListener('focusout', onBlur);
  figure.addEventListener('pointerdown', onTouchStart);
  figure.addEventListener('pointerup', onTouchEnd);
  figure.addEventListener('pointercancel', onTouchEnd);
  doc?.addEventListener('visibilitychange', syncVisibility);
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(positionIndicator) : null;
  resize?.observe(rail);
  const visibility = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => pause('offscreen', !entries[0].isIntersecting)) : null;
  visibility?.observe(figure);
  const state = doc && typeof MutationObserver === 'function' ? new MutationObserver(syncVisibility) : null;
  state?.observe(doc.documentElement, {attributes:true, attributeFilter:['class']});
  const dialog = doc?.querySelector('dialog');
  if (dialog) state?.observe(dialog, {attributes:true, attributeFilter:['open']});
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener?.('change', scheduleAuto);
  positionIndicator();
  syncVisibility();
  return () => {
    disposed = true;
    clearTimer(timer);
    cancelAnimationFrame(frame);
    figure.removeEventListener('click', select);
    figure.removeEventListener('keydown', keydown);
    figure.removeEventListener('pointermove', move);
    figure.removeEventListener('pointerenter', onEnter);
    figure.removeEventListener('pointerleave', onLeave);
    figure.removeEventListener('focusin', onFocus);
    figure.removeEventListener('focusout', onBlur);
    figure.removeEventListener('pointerdown', onTouchStart);
    figure.removeEventListener('pointerup', onTouchEnd);
    figure.removeEventListener('pointercancel', onTouchEnd);
    doc?.removeEventListener('visibilitychange', syncVisibility);
    motionPreference.removeEventListener?.('change', scheduleAuto);
    resize?.disconnect(); visibility?.disconnect(); state?.disconnect();
  };
}

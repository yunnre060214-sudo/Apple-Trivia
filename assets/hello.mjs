// This self-contained controller is inlined into the built HTML, before any
// question-bank/module requests complete. Keep all runtime dependencies local.
export function createHelloController({document, setTimer = setTimeout, clearTimer = clearTimeout, now = () => Date.now(), requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame}) {
  const root = document.documentElement;
  const overlay = document.getElementById('hello-intro');
  const content = document.getElementById('site-content');
  const skip = document.getElementById('hello-skip');
  const strokes = [...overlay.querySelectorAll('.hello-stroke')];
  const timers = new Set();
  let active = false, leaving = false, completed = false, previousFocus, frame, generation = 0;
  function clear() {
    for (const timer of timers) clearTimer(timer.id);
    timers.clear();
  }
  function arm(timer) {
    timer.started = now();
    timer.id = setTimer(() => { timers.delete(timer); timer.fn(); }, timer.remaining);
  }
  function later(fn, ms) {
    const timer = {fn, remaining:ms, id:null, started:0};
    timers.add(timer);
    if (!document.hidden) arm(timer);
  }
  const onKey = event => {
    if (!active || !['Tab', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation?.();
    if (event.key === 'Escape') finish();
    else (skip || overlay).focus({preventScroll:true});
  };
  function cleanup(restoreFocus = true) {
    clear(); cancelFrame(frame); generation++;
    root.classList.remove('hello-pending');
    overlay.classList.remove('hello-playing', 'hello-leaving', 'hello-paused', 'hello-complete');
    overlay.hidden = true; overlay.setAttribute('aria-busy', 'false');
    content.inert = false;
    document.removeEventListener('keydown', onKey, true);
    overlay.removeEventListener('animationend', onAnimationEnd);
    active = false; leaving = false; completed = false;
    if (restoreFocus) {
      const target = previousFocus && previousFocus !== document.body && previousFocus.isConnected ? previousFocus : document.getElementById('main');
      target?.focus({preventScroll:true});
    }
  }
  function finish() {
    if (!active || leaving) return;
    leaving = true; clear(); cancelFrame(frame); generation++;
    overlay.classList.add('hello-complete', 'hello-leaving');
    later(cleanup, 480);
  }
  function onAnimationEnd(event) {
    if (!active || completed || event.target !== strokes[strokes.length - 1] || event.animationName !== 'hello-write') return;
    completed = true; clear();
    later(finish, 500);
  }
  function onVisibility() {
    if (!active) return;
    overlay.classList.toggle('hello-paused', document.hidden);
    for (const timer of timers) {
      if (document.hidden && timer.id !== null) {
        clearTimer(timer.id);
        timer.remaining = Math.max(0, timer.remaining - (now() - timer.started));
        timer.id = null;
      } else if (!document.hidden && timer.id === null) arm(timer);
    }
  }
  function play({restart = false} = {}) {
    if (active && !restart) return false;
    if (active) cleanup(false);
    previousFocus = document.activeElement;
    active = true; leaving = false; completed = false;
    overlay.hidden = false; content.inert = true;
    overlay.setAttribute('aria-busy', 'true');
    root.classList.add('hello-pending');
    overlay.classList.remove('hello-playing', 'hello-leaving', 'hello-complete');
    overlay.classList.toggle('hello-paused', document.hidden);
    // Actual SVG lengths avoid normalized pathLength/dash rendering differences.
    for (const stroke of strokes) {
      let length = 4000;
      try { length = stroke.getTotalLength() || length; } catch {}
      stroke.style.setProperty('--hello-length', String(length));
    }
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('animationend', onAnimationEnd);
    overlay.focus({preventScroll:true});
    const token = ++generation;
    // Paint the hidden strokes before beginning, including refresh/BFCache replay.
    frame = requestFrame(() => {
      if (!active || token !== generation) return;
      frame = requestFrame(() => {
        if (!active || token !== generation) return;
        overlay.classList.add('hello-playing');
        // Missing animation events recover only after a full visible playback window.
        later(finish, 6000);
      });
    });
    return true;
  }
  document.addEventListener('visibilitychange', onVisibility);
  skip?.addEventListener('click', finish);
  return {play};
}

export function replayHello() { return window.appleTriviaHello?.play(); }

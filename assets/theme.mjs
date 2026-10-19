// Browser chrome commits after the last wave. Safari paints this outside the page.
export function setBrowserTheme(document, theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.browserTheme = value;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value === 'dark' ? '#080d1b' : '#f5f4f0';
}

// A DOM-only visual copy. No IDs, scripts, event handlers, focus targets or live
// regions survive. The original page remains the only interactive document.
export function createThemeSurface({document, window, theme}) {
  const source = document.getElementById('site-content');
  if (!source) throw new Error('Missing page');
  const surface = document.createElement('div');
  surface.className = 'theme-surface theme-palette';
  surface.dataset.theme = theme;
  surface.setAttribute('aria-hidden', 'true');
  surface.inert = true;
  const copy = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  copies.forEach((node, i) => {
    if (node.id) { node.dataset.themeCopyId = node.id; node.removeAttribute('id'); }
    node.removeAttribute('autofocus');
    node.removeAttribute('aria-live');
    node.removeAttribute('aria-labelledby');
    node.removeAttribute('aria-describedby');
    if (node.matches('a,button,input,select,textarea,[tabindex]')) node.setAttribute('tabindex','-1');

  });
  copy.querySelectorAll('script,dialog,[data-theme-copy-id="toast"],[data-theme-copy-id="celebration"]').forEach(node => node.remove());
  copy.classList.add('theme-page-copy');
  copy.inert = true;
  copy.style.top = `${-window.scrollY}px`;
  copy.style.left = '0px';
  copy.style.width = `${document.documentElement.clientWidth || window.innerWidth}px`;
  surface.append(copy);
  document.body.append(surface);
  // Read only the few animated poses and the scrolling rail, rather than
  // forcing layout reads for every descendant on every rapid click.
  const poses='.hero-title-line,.hero-title-apple,.hero-actions,.archive,.archive-layer.is-active .archive-object img';
  const originalPoses=[...source.querySelectorAll(poses)];
  const copyPoses=[...copy.querySelectorAll(poses)];
  originalPoses.forEach((node,i)=>{
    const style=window.getComputedStyle(node);
    for(const key of ['transform','translate','rotate','scale','opacity','clip-path']) copyStyle(copyPoses[i],style,key);
  });
  const originalRails=[...source.querySelectorAll('.archive-select,textarea')];
  copy.querySelectorAll('.archive-select,textarea').forEach((node,i)=>{
    node.scrollLeft=originalRails[i].scrollLeft; node.scrollTop=originalRails[i].scrollTop;
  });
  originals.forEach((node,i)=>{
    if (!copies[i].isConnected || !node.matches('input,select,textarea')) return;
    copies[i].value=node.value;
    if ('checked' in node) copies[i].checked=node.checked;
  });
  return surface;
}
function copyStyle(node, style, key) { node.style.setProperty(key, style.getPropertyValue(key)); }

// Native View Transitions serialize captures and replace preceding transitions.
// Independent clipped surfaces instead let 3, 5 or 20 waves coexist freely.
export function createThemeSwitcher({document, window, applyTheme, saveTheme, commitTheme = () => {}, reducedMotion = () => false, createSurface = createThemeSurface}) {
  const root = document.documentElement;
  let revision = 0, surfaces = [], active = new Set();
  function remove(surface) { surface.remove(); surfaces = surfaces.filter(s => s !== surface); }
  function settle() {
    revision++;
    const pending = [...active]; active.clear();
    pending.forEach(record => { window.clearTimeout(record.timer); record.animation.cancel(); record.resolve(true); });
    surfaces.forEach(surface => surface.remove()); surfaces = [];
    root.classList.remove('theme-revealing');
    delete root.dataset.themeWaves;
    commitTheme(root.dataset.theme);
  }
  function switchTheme(button) {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const oldTheme = root.dataset.theme;
    const token = ++revision;
    let wave;
    try {
      if (reducedMotion() || typeof document.createElement('div').animate !== 'function') {
        applyTheme(theme); saveTheme(theme); settle(); return Promise.resolve(true);
      }
      if (!surfaces.length) surfaces.push(createSurface({document,window,theme:oldTheme}));
      root.classList.add('theme-revealing');
      applyTheme(theme); saveTheme(theme);
      wave = createSurface({document,window,theme});
      const bounds = button.getBoundingClientRect();
      const width = Math.max(window.innerWidth, root.clientWidth || 0, window.visualViewport?.width || 0);
      const height = Math.max(window.innerHeight, root.clientHeight || 0, window.visualViewport?.height || 0);
      const x = Math.max(0,Math.min(width,bounds.left+bounds.width/2));
      const y = Math.max(0,Math.min(height,bounds.top+bounds.height/2));
      const radius = Math.ceil(Math.hypot(Math.max(x,width-x),Math.max(y,height-y)))+4;
      wave.classList.add('theme-wave');
      wave.style.clipPath = `circle(0px at ${x}px ${y}px)`;
      surfaces.push(wave);
      const animation = wave.animate([
        {clipPath:`circle(0px at ${x}px ${y}px)`},
        {clipPath:`circle(${radius}px at ${x}px ${y}px)`},
      ], {duration:1050,easing:'cubic-bezier(.16,.62,.25,1)',fill:'forwards'});
      return new Promise(resolve => {
        const record = {animation,resolve,timer:null};
        let done = false;
        function complete() {
          if (done) return;
          done = true; active.delete(record); window.clearTimeout(record.timer);
          if (!surfaces.includes(wave)) return resolve(true);
          // Preserve the completed floor with CSS, then release the filled WAAPI
          // effect even while a younger curtain is still running above it.
          wave.style.clipPath = 'none';
          animation.cancel();
          // Completed older waves become the solid floor for younger waves.
          const before = surfaces.slice(0,surfaces.indexOf(wave));
          before.forEach(remove);
          if (token === revision) {
            active.forEach(earlier=>{window.clearTimeout(earlier.timer);earlier.animation.cancel();earlier.resolve(true);});
            active.clear();
            surfaces.forEach(surface => surface.remove()); surfaces = [];
            root.classList.remove('theme-revealing');
            delete root.dataset.themeWaves;
            commitTheme(root.dataset.theme);
          } else root.dataset.themeWaves = String(active.size);
          resolve(true);
        }
        active.add(record);
        root.dataset.themeWaves = String(active.size);
        record.timer = window.setTimeout(complete,1250);
        animation.finished.then(complete,complete);
      });
    } catch {
      wave?.remove();
      if (root.dataset.theme !== theme) { applyTheme(theme); saveTheme(theme); }
      settle(); return Promise.resolve(true);
    }
  }
  const onOtherAction = event => {
    if (surfaces.length && !event.target.closest('[data-action="theme"]')) settle();
  };
  const onViewport = () => { if (surfaces.length) settle(); };
  const onHidden = () => { if (document.hidden) onViewport(); };
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onPreference = event => { if (event.matches) onViewport(); };
  document.addEventListener('click',onOtherAction,true);
  document.addEventListener('visibilitychange',onHidden);
  preference?.addEventListener?.('change',onPreference);
  window.addEventListener('resize',onViewport,{passive:true});
  window.addEventListener('scroll',onViewport,{passive:true});
  window.addEventListener('pagehide',onViewport);
  switchTheme.settle = settle;
  switchTheme.dispose = () => {
    settle();
    document.removeEventListener('click',onOtherAction,true);
    document.removeEventListener('visibilitychange',onHidden);
    preference?.removeEventListener?.('change',onPreference);
    window.removeEventListener('resize',onViewport);
    window.removeEventListener('scroll',onViewport);
    window.removeEventListener('pagehide',onViewport);
  };
  return switchTheme;
}

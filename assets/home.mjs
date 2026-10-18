export function atmosphereMarkup() {
  return `<div class="home-atmosphere" aria-hidden="true"><div class="home-paper-grid"></div><div class="home-star-field"></div><div class="home-aurora aurora-blue"></div><div class="home-aurora aurora-rose"></div><div class="home-aurora aurora-gold"></div><svg class="home-ribbons" viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="home-flow" x1="0" y1="0" x2="1440" y2="960" gradientUnits="userSpaceOnUse"><stop stop-color="#3e99db" stop-opacity="0"/><stop offset=".27" stop-color="#619edb"/><stop offset=".5" stop-color="#bc70c5"/><stop offset=".72" stop-color="#efb36a"/><stop offset="1" stop-color="#efb36a" stop-opacity="0"/></linearGradient></defs><g fill="none" stroke="url(#home-flow)"><path class="home-ribbon ribbon-one" d="M-180 690C200 740 240 100 720 210S1290 700 1650 210"/><path class="home-ribbon ribbon-two" d="M-180 725C200 775 240 135 720 245S1290 735 1650 245"/><path class="home-ribbon ribbon-three" d="M-180 760C200 810 240 170 720 280S1290 770 1650 280"/></g></svg><div class="home-entry-flare"></div></div>`;
}

export function opticalOffset(leadMetrics, wordMetrics) {
  return Number((leadMetrics.actualBoundingBoxLeft-wordMetrics.actualBoundingBoxLeft).toFixed(3));
}
export function mountHome(main, {document,window}) {
  const lead = main.querySelector('.hero-title-line');
  const word = main.querySelector('.hero-title-apple');
  let disposed = false;
  function align() {
    if (disposed || !lead || !word) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const measure = node => {
      const css = window.getComputedStyle(node);
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return context.measureText(node.textContent);
    };
    const offset = opticalOffset(measure(lead),measure(word));
    if (Number.isFinite(offset)) lead.style.setProperty('--title-optical-x',`${offset}px`);
  }
  align(); document.fonts?.ready.then(align);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(align) : null;
  observer?.observe(word);
  return () => { disposed = true; observer?.disconnect(); };
}

export function questionFromHash(hash) {
  if (!hash.startsWith('#q=')) return null;
  try { const id=decodeURIComponent(hash.slice(3)); return /^gallery-[a-z0-9-]+$/.test(id)?id:null; } catch { return null; }
}

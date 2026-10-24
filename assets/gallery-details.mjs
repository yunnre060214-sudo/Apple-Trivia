// Product-specific demonstrations stay in the existing 480 × 440 art space.
// They run on intentional hover/focus and never move the hit target.
export function galleryDetailMotion(id){
 const art={
  mac:'<g class="detail-scan"><path d="M181 138h103" stroke="#cfefd2" stroke-width="2" opacity=".7"/></g>',
  imac:'<path class="detail-shell" d="M310 112C347 126 369 158 378 193" stroke="#e1ffff" stroke-width="3" pathLength="1"/>',
  ipod:'<g transform="rotate(-7 240 222)"><circle class="detail-wheel" cx="239" cy="272" r="52" stroke="#859baa" stroke-width="2" stroke-dasharray="34 293"/><rect class="detail-selection" x="180" y="120" width="117" height="15" rx="2" fill="#546b58" opacity=".16"/></g>',
  iphone:'<g transform="rotate(7 240 222)"><circle class="detail-touch" cx="190" cy="144" r="13" stroke="#c9e8ff" stroke-width="2"/></g>',
  macbook:'<path class="detail-track" d="M222 341q18-13 36 0M228 348q12-9 24 0" stroke="#587c9a" stroke-width="2" stroke-linecap="round" pathLength="1"/>',
  ipad:'<g transform="rotate(-7 240 223)"><circle class="detail-pinch-a" cx="213" cy="210" r="8" stroke="#c8e4ff" stroke-width="2"/><circle class="detail-pinch-b" cx="269" cy="210" r="8" stroke="#c8e4ff" stroke-width="2"/></g>',
  watch:'<g transform="rotate(10 240 222)"><circle class="detail-ring" cx="242" cy="230" r="30" stroke="#fa6684" stroke-width="4" pathLength="1"/><circle class="detail-ring detail-ring-two" cx="242" cy="230" r="22" stroke="#b8e368" stroke-width="4" pathLength="1"/><circle class="detail-ring detail-ring-three" cx="242" cy="230" r="14" stroke="#65d9dd" stroke-width="4" pathLength="1"/></g>',
  airpods:'<circle class="detail-pair" cx="240" cy="210" r="9" stroke="#63a987" stroke-width="2"/><circle class="detail-pair detail-pair-two" cx="240" cy="210" r="9" stroke="#63a987" stroke-width="1.5"/>',
  vision:'<ellipse class="detail-focus" cx="240" cy="247" rx="32" ry="24" stroke="#b2cef5" stroke-width="1.5"/><circle class="detail-focus-dot" cx="240" cy="247" r="3" fill="#cbe1ff"/>',
 };
 return `<svg class="archive-detail-motion" viewBox="0 0 480 440" fill="none" aria-hidden="true">${art[id]||''}</svg>`;
}

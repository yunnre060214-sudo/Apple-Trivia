const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function questionMedia(q,{compact=false}={}) {
  const m=q.media;if(!m)return '';
  return `<figure class="question-media ${compact?'is-compact':''}" data-question-media><div class="media-art"><img src="./assets/visual/${escape(m.asset)}?v=${VERSION}" alt="${escape(m.alt)}" width="640" height="320" decoding="async" ${compact?'loading="lazy"':''}></div><figcaption>${escape(m.caption)}</figcaption><p class="media-fallback" hidden>图片暂时无法显示。${escape(m.fallback)}</p></figure>`;
}
// A readable fallback lives in the original markup and also works for cached failures.
export function mountQuestionMedia(root) {
  const disposers=[];
  for(const figure of root.querySelectorAll('[data-question-media]')) {
    const img=figure.querySelector('img');
    const fail=()=>{img.hidden=true;figure.querySelector('.media-fallback').hidden=false;figure.classList.add('media-unavailable');};
    img.addEventListener('error',fail);disposers.push(()=>img.removeEventListener('error',fail));
    if(img.complete&&!img.naturalWidth)fail();
  }
  return ()=>disposers.forEach(dispose=>dispose());
}
import {VERSION} from '../src/engine.mjs';

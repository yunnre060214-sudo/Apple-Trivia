import {SURFACE_PROPERTIES} from './surface.mjs?v=__VERSION__';
const SVG='http://www.w3.org/2000/svg';
let identity=0;

// A shared DocumentTimeline lets the alternate palette use the exact same
// animation phase. No computed transforms, frozen poses or replayed entrances.
export function synchronizeAnimations(originals,copies,sourceForCopy,copyForSource=new Map([...sourceForCopy].map(([copy,source])=>[source,copy]))) {
  const clocks=new Map(),mirrored=[];
  const matchClock=(animation,original)=>{
    animation.playbackRate=original.playbackRate;
    if(original.playState==='running') {
      animation.play();
      if(original.startTime!==null)animation.startTime=original.startTime;
      else animation.currentTime=original.currentTime;
    } else {animation.pause();animation.currentTime=original.currentTime;}
  };
  for(const animation of originals) {
    if(!animation.animationName)continue;
    const target=animation.effect?.target;
    if(!clocks.has(target))clocks.set(target,new Map());
    clocks.get(target).set(`${animation.animationName}:${animation.effect.pseudoElement||''}`,animation);
  }
  for(const animation of copies) {
    const source=sourceForCopy.get(animation.effect?.target);
    const original=clocks.get(source)?.get(`${animation.animationName}:${animation.effect.pseudoElement||''}`);
    if(!original)continue;
    matchClock(animation,original);
  }
  for(const original of originals) {
    if(original.animationName||!original.effect?.getKeyframes)continue;
    const copy=copyForSource.get(original.effect.target);if(!copy?.animate)continue;
    const animation=copy.animate(original.effect.getKeyframes(),original.effect.getTiming());
    animation.finished?.catch(()=>{});
    matchClock(animation,original);mirrored.push(animation);
  }
  return mirrored;
}

export function createThemeScene({document,window,theme,width,height,duration=780}) {
  const source=document.getElementById('site-content');
  if(!source||typeof source.getAnimations!=='function')throw Error('Missing page animation API');
  const prefix=`theme-scene-${++identity}`,sourceForCopy=new Map(),copyForSource=new Map();
  const surface=document.createElement('div');surface.className='theme-surface theme-palette';
  surface.dataset.theme=theme;surface.setAttribute('aria-hidden','true');surface.inert=true;
  const copy=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
  const ids=new Map();
  for(let i=0;i<copies.length;i++) {
    const node=copies[i];sourceForCopy.set(node,originals[i]);copyForSource.set(originals[i],node);
    // A prepared palette must not preserve a pointer light after it has left.
    if(node.dataset.surfaceActive!==undefined){delete node.dataset.surfaceActive;SURFACE_PROPERTIES.forEach(key=>node.style.removeProperty(key));}
    if(node.id){ids.set(node.id,`${prefix}-${node.id}`);node.dataset.themeCopyId=node.id;node.removeAttribute('id');}
    for(const attribute of ['autofocus','aria-live','aria-labelledby','aria-describedby'])node.removeAttribute(attribute);
    if(node.matches('a,button,input,select,textarea,[tabindex]'))node.setAttribute('tabindex','-1');
  }
  // Keep SVG paint servers local to this palette, without duplicate document IDs.
  for(const node of copies) {
    const oldId=node.dataset.themeCopyId;
    if(node.namespaceURI===SVG&&oldId)node.id=ids.get(oldId);
    for(const attribute of [...node.attributes]) {
      if(!attribute.value.includes('url(#'))continue;
      node.setAttribute(attribute.name,attribute.value.replace(/url\(#([^)]+)\)/g,(all,id)=>ids.has(id)?`url(#${ids.get(id)})`:all));
    }
  }
  copy.querySelectorAll('script,dialog,[data-theme-copy-id="toast"],[data-theme-copy-id="celebration"]').forEach(node=>node.remove());
  copy.classList.add('theme-page-copy');copy.inert=true;
  Object.assign(copy.style,{top:`${-window.scrollY}px`,left:'0px',width:`${document.documentElement.clientWidth||width}px`});
  surface.style.clipPath='path(evenodd,"M0 0L0 0Z")';surface.style.opacity='0';surface.append(copy);
  document.body.append(surface);
  let animations=surface.getAnimations({subtree:true});
  const waves=new Set(),shapes=new Set();let frame=null,origin=null,floor=false,scoreObserver=null;
  const now=()=>window.performance.now();
  function draw() {
    const parts=[floor?`M0 0H${width}V${height}H0Z`:'M0 0L0 0Z'];
    if(origin)for(const shape of shapes) {
      const r=Number(shape.currentRadius.toFixed(3));if(!r)continue;
      const {x,y}=origin;
      parts.push(`M${x-r} ${y}A${r} ${r} 0 1 0 ${x+r} ${y}A${r} ${r} 0 1 0 ${x-r} ${y}Z`);
    }
    // All waves share one stationary control origin, so older circles contain
    // younger circles. Even-odd contours reproduce alternating reveal/erase
    // exactly, without SVG reference resources or one DOM layer per click.
    surface.style.clipPath=`path(evenodd,"${parts.join(' ')}")`;
  }
  function schedule(){if(frame===null&&waves.size)frame=window.requestAnimationFrame(tick);}
  function tick(time) {
    frame=null;
    for(const wave of [...waves]) {
      const progress=Math.max(0,Math.min(1,(time-wave.started)/duration));
      wave.currentRadius=origin.radius*(1-Math.pow(1-progress,3));
      if(progress===1){waves.delete(wave);wave.resolve();}
    }
    draw();
    schedule();
  }
  function updateControl() {
    const original=document.getElementById('theme-toggle'),button=copyForSource.get(original);
    if(button)button.innerHTML=original.innerHTML;
  }
  return {
    theme,
    begin() {
      // Counter synchronization reads inline values only, without layout reads.
      const scores=[...source.querySelectorAll('.result-score strong')];
      const syncScores=()=>scores.forEach(original=>{
        const node=copyForSource.get(original);if(!node)return;
        node.textContent=original.textContent;
        for(const key of ['--score-weight','min-width']){const value=original.style.getPropertyValue(key);if(value)node.style.setProperty(key,value);else node.style.removeProperty(key);}
        const emblem=source.querySelector('.result-emblem'),alternate=copyForSource.get(emblem);
        if(alternate&&emblem.dataset.scoreComplete!==undefined)alternate.dataset.scoreComplete='';
      });
      syncScores();
      if(scores.length&&window.MutationObserver){scoreObserver=new window.MutationObserver(syncScores);scores.forEach(node=>scoreObserver.observe(node,{childList:true,attributes:true,attributeFilter:['style']}));}
      for(const original of source.querySelectorAll('.archive-select,input,select,textarea,.archive,.hero-title-line')) {
        const node=copyForSource.get(original);if(!node)continue;
        if(original.matches('.archive-select,textarea')){node.scrollLeft=original.scrollLeft;node.scrollTop=original.scrollTop;}
        if(original.matches('input,select,textarea')){node.value=original.value;if('checked'in original)node.checked=original.checked;}
        if(original.matches('.archive')){node.style.setProperty('--art-x',original.style.getPropertyValue('--art-x'));node.style.setProperty('--art-y',original.style.getPropertyValue('--art-y'));}
        if(original.matches('.hero-title-line'))node.style.setProperty('--title-optical-x',original.style.getPropertyValue('--title-optical-x'));
      }
      animations.push(...synchronizeAnimations(source.getAnimations({subtree:true}),animations,sourceForCopy,copyForSource));
      surface.style.opacity='1';
    },
    updateControl,
    setFloor(show){floor=show;draw();},
    addWave({x,y,radius,show}) {
      if(!origin)origin={x,y,radius};
      let resolve;const finished=new Promise(done=>resolve=done);
      const wave={currentRadius:0,started:now(),resolve};waves.add(wave);shapes.add(wave);schedule();
      const animation={finished,
        get currentTime(){return now()-wave.started;},
        set currentTime(value){wave.started=now()-value;},
        cancel(){waves.delete(wave);resolve();if(!waves.size&&frame!==null){window.cancelAnimationFrame(frame);frame=null;}},
      };
      return {animation,remove:()=>{shapes.delete(wave);draw();}};
    },
    dispose(){scoreObserver?.disconnect();if(frame!==null)window.cancelAnimationFrame(frame);frame=null;waves.forEach(wave=>wave.resolve());waves.clear();shapes.clear();animations.forEach(animation=>animation.cancel());animations=[];surface.remove();},
  };
}

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

export function createThemeScene({document,window,theme,width,height}) {
  const source=document.getElementById('site-content');
  if(!source||typeof source.getAnimations!=='function')throw Error('Missing page animation API');
  const prefix=`theme-scene-${++identity}`,sourceForCopy=new Map(),copyForSource=new Map();
  const surface=document.createElement('div');surface.className='theme-surface theme-palette';
  surface.dataset.theme=theme;surface.setAttribute('aria-hidden','true');surface.inert=true;
  const copy=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
  const ids=new Map();
  for(let i=0;i<copies.length;i++) {
    const node=copies[i];sourceForCopy.set(node,originals[i]);copyForSource.set(originals[i],node);
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
  const defs=document.createElementNS(SVG,'svg');defs.classList.add('theme-mask-defs');defs.setAttribute('aria-hidden','true');
  const mask=document.createElementNS(SVG,'mask');mask.id=`${prefix}-mask`;
  for(const [key,value] of Object.entries({maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width,height,'mask-type':'luminance'}))mask.setAttribute(key,String(value));
  const floor=document.createElementNS(SVG,'rect');
  for(const [key,value] of Object.entries({x:0,y:0,width,height,fill:'black'}))floor.setAttribute(key,String(value));
  mask.append(floor);defs.append(mask);
  surface.style.maskImage=`url("#${mask.id}")`;surface.style.webkitMaskImage=surface.style.maskImage;
  surface.style.maskMode='luminance';surface.style.opacity='0';surface.append(copy);
  document.body.append(defs,surface);
  let animations=surface.getAnimations({subtree:true});
  function updateControl() {
    const original=document.getElementById('theme-toggle'),button=copyForSource.get(original);
    if(button)button.innerHTML=original.innerHTML;
  }
  return {
    theme,
    begin() {
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
    setFloor(show){floor.setAttribute('fill',show?'white':'black');},
    addWave({x,y,radius,show}) {
      const circle=document.createElementNS(SVG,'circle');circle.classList.add('theme-wave');
      circle.setAttribute('r',String(radius));circle.setAttribute('fill',show?'white':'black');
      circle.style.transformOrigin='0 0';circle.style.transform=`translate(${x}px,${y}px) scale(0)`;
      mask.append(circle);
      const animation=circle.animate([{transform:`translate(${x}px,${y}px) scale(0)`},{transform:`translate(${x}px,${y}px) scale(1)`}],{duration:780,easing:'cubic-bezier(.16,.62,.25,1)',fill:'forwards'});
      return {animation,remove:()=>circle.remove()};
    },
    dispose(){animations.forEach(animation=>animation.cancel());animations=[];surface.remove();defs.remove();},
  };
}

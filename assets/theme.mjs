import {createThemeScene} from './theme-scene.mjs?v=__VERSION__';

export function setBrowserTheme(document, theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.browserTheme = value;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value === 'dark' ? '#080d1b' : '#f5f4f0';
}

// The real page keeps its palette and animation clocks while one live alternate
// palette is revealed/erased by lightweight circles. A burst never clones pages.
export function createThemeSwitcher({document, window, applyTheme, previewTheme=()=>{}, saveTheme, commitTheme=()=>{}, reducedMotion=()=>false, duration=780, createScene=createThemeScene}) {
  const root=document.documentElement;
  let target=root.dataset.theme, scene=null, ready=false, disposed=false;
  let preparation=null, preparationIsIdle=false, frame=null, sequence=0;
  let commitFrame=null;
  const requests=new Set(),listeners=[];
  const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  const now=()=>window.performance?.now()??0;
  const supported=()=>typeof document.createElement('div').animate==='function';
  const viewport=()=>({width:Math.max(window.innerWidth,root.clientWidth||0,window.visualViewport?.width||0),height:Math.max(window.innerHeight,root.clientHeight||0,window.visualViewport?.height||0)});
  function cancelPreparation() {
    if(preparation===null)return;
    if(preparationIsIdle)window.cancelIdleCallback(preparation);else window.clearTimeout(preparation);
    preparation=null;
  }
  function prepare() {
    preparation=null;
    if(disposed||scene||requests.size||reducedMotion()||!supported()||document.hidden)return;
    try {scene=createScene({document,window,duration,theme:root.dataset.theme==='dark'?'light':'dark',...viewport()});}
    catch {scene=null;}
  }
  function warm() {
    if(disposed||preparation!==null||scene||requests.size||reducedMotion()||!supported()||document.hidden)return;
    preparationIsIdle=typeof window.requestIdleCallback==='function';
    preparation=preparationIsIdle?window.requestIdleCallback(prepare,{timeout:800}):window.setTimeout(prepare,80);
  }
  function release(record) {
    if(!requests.delete(record))return;
    window.clearTimeout(record.timer);record.wave?.animation.cancel();record.wave?.remove();record.resolve(true);
  }
  function clearCommit() {
    if(commitFrame!==null)window.cancelAnimationFrame(commitFrame);
    commitFrame=null;root.classList.remove('theme-committing');
  }
  function settle(theme) {
    cancelPreparation();
    if(frame!==null){window.cancelAnimationFrame(frame);frame=null;}
    const finalTheme=theme??(requests.size?target:root.dataset.theme);
    const changing=root.dataset.theme!==finalTheme;
    clearCommit();
    const atomic=changing&&!disposed&&document.getElementById?.('site-content');
    if(atomic)root.classList.add('theme-committing');
    [...requests].forEach(release);
    scene?.dispose();scene=null;ready=false;
    target=finalTheme;
    root.classList.remove('theme-revealing');
    delete root.dataset.themeWaves;delete root.dataset.themeTarget;
    applyTheme(finalTheme);commitTheme(finalTheme);
    // Paint the final palette with color transitions suppressed, then restore
    // normal hover transitions. Otherwise the old button colors flash back as
    // soon as the alternate scene is removed. Input never waits for these frames.
    if(atomic)commitFrame=window.requestAnimationFrame(()=>{
      commitFrame=window.requestAnimationFrame(()=>{commitFrame=null;root.classList.remove('theme-committing');});
    });
    warm();
  }
  function complete(record) {
    if(!requests.has(record))return;
    const floor=record.theme===scene.theme;
    // A finished circle covers the viewport. Replace it and all older circles
    // with one mask rectangle while preserving every younger wave above it.
    scene.setFloor(floor);
    [...requests].filter(other=>other.order<=record.order).forEach(release);
    if(!requests.size)settle(target);
    else root.dataset.themeWaves=String(requests.size);
  }
  function launch(record) {
    record.wave=scene.addWave({...record,show:record.theme===scene.theme});
    const animation=record.wave.animation;
    animation.currentTime=Math.min(duration,Math.max(0,now()-record.started));
    record.timer=window.setTimeout(()=>complete(record),duration+220);
    animation.finished.then(()=>complete(record),()=>complete(record));
  }
  function begin() {
    scene.begin();ready=true;root.classList.add('theme-revealing');
  }
  function flush() {
    frame=null;if(!requests.size||disposed)return;
    try {
      if(!scene)scene=createScene({document,window,duration,theme:root.dataset.theme==='dark'?'light':'dark',...viewport()});
      if(!ready)begin();
      scene.updateControl();
      requests.forEach(record=>{if(!record.wave)launch(record);});
    } catch {settle(target);}
  }
  function switchTheme(button) {
    if(disposed)return Promise.resolve(false);
    if(!requests.size)target=root.dataset.theme;
    target=target==='dark'?'light':'dark';
    const theme=target;
    if(reducedMotion()||!supported()) {
      saveTheme(theme);settle(theme);return Promise.resolve(true);
    }
    // Read geometry before changing icon DOM. No computed-style snapshots or
    // palette invalidation occurs on the click path, including rapid repeats.
    const {width,height}=viewport(),bounds=button.getBoundingClientRect();
    const x=Math.max(0,Math.min(width,bounds.left+bounds.width/2));
    const y=Math.max(0,Math.min(height,bounds.top+bounds.height/2));
    const radius=Math.ceil(Math.hypot(Math.max(x,width-x),Math.max(y,height-y)))+4;
    cancelPreparation();
    if(scene&&!ready)try{begin();}catch{scene.dispose();scene=null;ready=false;}
    previewTheme(theme);saveTheme(theme);root.dataset.themeTarget=theme;
    return new Promise(resolve=>{
      const record={theme,x,y,radius,started:now(),order:++sequence,resolve,wave:null,timer:null};
      requests.add(record);root.dataset.themeWaves=String(requests.size);
      if(ready)try{scene.updateControl();launch(record);}catch{settle(theme);}
      else if(frame===null)frame=window.requestAnimationFrame(flush);
    });
  }
  function invalidate() {
    if(requests.size)return;
    scene?.dispose();scene=null;ready=false;warm();
  }
  const onOtherAction=event=>{if(requests.size&&!event.target.closest('[data-action="theme"]'))settle();};
  const onViewport=()=>{if(requests.size)settle();else invalidate();};
  const onHidden=()=>{if(document.hidden){if(requests.size)settle();cancelPreparation();scene?.dispose();scene=null;}else warm();};
  listen(document,'click',onOtherAction,true);listen(document,'visibilitychange',onHidden);
  listen(window,'resize',onViewport,{passive:true});listen(window,'scroll',onViewport,{passive:true});
  listen(window,'pagehide',()=>{if(requests.size)settle();cancelPreparation();scene?.dispose();scene=null;});
  const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(preference?.addEventListener)listen(preference,'change',event=>{if(event.matches)settle();else warm();});
  const source=document.getElementById?.('site-content');
  const observer=source&&window.MutationObserver?new window.MutationObserver(records=>{
    if(records.some(record=>!record.target.closest?.('[data-action="theme"]')))invalidate();
  }):null;
  observer?.observe(source,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed','disabled','data-paused']});
  warm();
  switchTheme.settle=settle;
  switchTheme.prepare=warm;
  switchTheme.dispose=()=>{disposed=true;settle();observer?.disconnect();listeners.forEach(remove=>remove());};
  return switchTheme;
}

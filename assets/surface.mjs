// Time-based damping shares one frame pump, including the return to rest.
// Converged surfaces stop scheduling; refresh rate does not change the response.
// Touch, reduced motion and offscreen pages keep their normal, static surfaces.
export const SURFACE_PROPERTIES=Object.freeze(['--spot-x','--spot-y','--card-rx','--card-ry','--surface-light']);
export function mountSurfacePointer(root,{document,window,selector='.answer',tilt=false}={}) {
  if(!root)return ()=>{};
  const hover=window.matchMedia('(hover:hover) and (pointer:fine)'),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners=[],states=new Map(),properties=SURFACE_PROPERTIES;
  let active=null,frame=null,lastTime=null,disposed=false;
  const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  function clear(node){delete node.dataset.surfaceActive;properties.forEach(key=>node.style.removeProperty(key));states.delete(node);}
  function reset() {
    if(frame!==null)window.cancelAnimationFrame(frame);
    frame=null;lastTime=null;active=null;[...states.keys()].forEach(clear);
  }
  function schedule(){if(frame===null){if(lastTime===null)lastTime=window.performance?.now()??null;frame=window.requestAnimationFrame(paint);}}
  function leave(){if(active){Object.assign(active,{targetX:.5,targetY:.5,targetLight:0});active=null;schedule();}}
  function paint(time) {
    frame=null;
    if(disposed||!root.isConnected||document.hidden||!hover.matches||reduce.matches){reset();return;}
    const delta=lastTime===null?1000/60:Math.max(0,Math.min(64,time-lastTime));lastTime=time;
    const follow=1-Math.exp(-delta/(tilt?90:65)),fade=1-Math.exp(-delta/65);
    let moving=false;
    for(const [node,state] of states){
      if(!node.isConnected||node.disabled){if(active===state)active=null;clear(node);continue;}
      state.x+=(state.targetX-state.x)*follow;state.y+=(state.targetY-state.y)*follow;state.light+=(state.targetLight-state.light)*fade;
      const settled=Math.max(Math.abs(state.x-state.targetX),Math.abs(state.y-state.targetY),Math.abs(state.light-state.targetLight))<.002;
      if(settled){state.x=state.targetX;state.y=state.targetY;state.light=state.targetLight;if(!state.targetLight){clear(node);continue;}}
      else moving=true;
      node.style.setProperty('--spot-x',`${(state.x*100).toFixed(2)}%`);node.style.setProperty('--spot-y',`${(state.y*100).toFixed(2)}%`);
      node.style.setProperty('--surface-light',state.light.toFixed(3));
      if(tilt){node.style.setProperty('--card-rx',`${((.5-state.y)*5).toFixed(2)}deg`);node.style.setProperty('--card-ry',`${((state.x-.5)*7).toFixed(2)}deg`);}
      node.dataset.surfaceActive='';
    }
    if(moving)schedule();else lastTime=null;
  }
  function move(event) {
    if(disposed||event.pointerType==='touch'||document.hidden||!hover.matches||reduce.matches){reset();return;}
    const target=event.target.closest?.(selector);
    if(!target||!root.contains(target)||target.disabled||target.closest('[inert],.theme-surface')){leave();return;}
    if(states.get(target)!==active){
      leave();active=states.get(target)||{x:.5,y:.5,light:0};active.bounds=target.getBoundingClientRect();states.set(target,active);
    }
    const bounds=active.bounds;
    if(!bounds.width||!bounds.height){reset();return;}
    active.targetX=Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width));active.targetY=Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height));active.targetLight=1;schedule();
  }
  listen(root,'pointermove',move,{passive:true});
  listen(root,'pointerleave',leave);listen(root,'pointercancel',reset);
  listen(document,'scroll',reset,{capture:true,passive:true});
  listen(document,'visibilitychange',reset);listen(window,'blur',reset);listen(window,'pagehide',reset);listen(window,'resize',reset,{passive:true});
  if(hover.addEventListener)listen(hover,'change',reset);
  if(reduce.addEventListener)listen(reduce,'change',reset);
  return ()=>{disposed=true;reset();listeners.forEach(remove=>remove());};
}

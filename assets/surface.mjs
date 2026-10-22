// Pointer light and card tilt share one pending frame. There is no idle loop.
// Touch, reduced motion and offscreen pages keep their normal, static surfaces.
export function mountSurfacePointer(root,{document,window,selector='.answer',tilt=false}={}) {
  if(!root)return ()=>{};
  const hover=window.matchMedia('(hover:hover) and (pointer:fine)'),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners=[],properties=['--spot-x','--spot-y','--card-rx','--card-ry'];
  let active=null,bounds=null,pending=null,frame=null,disposed=false;
  const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
  function reset() {
    if(frame!==null)window.cancelAnimationFrame(frame);
    frame=null;pending=null;bounds=null;
    if(active){delete active.dataset.surfaceActive;properties.forEach(key=>active.style.removeProperty(key));}
    active=null;
  }
  function paint() {
    frame=null;
    if(disposed||!active?.isConnected||!root.isConnected||active.disabled||document.hidden||!hover.matches||reduce.matches){reset();return;}
    const x=Math.max(0,Math.min(1,(pending.x-bounds.left)/bounds.width));
    const y=Math.max(0,Math.min(1,(pending.y-bounds.top)/bounds.height));
    active.style.setProperty('--spot-x',`${(x*100).toFixed(2)}%`);
    active.style.setProperty('--spot-y',`${(y*100).toFixed(2)}%`);
    if(tilt){active.style.setProperty('--card-rx',`${((.5-y)*5).toFixed(2)}deg`);active.style.setProperty('--card-ry',`${((x-.5)*7).toFixed(2)}deg`);}
    active.dataset.surfaceActive='';
  }
  function move(event) {
    if(disposed||event.pointerType==='touch'||document.hidden||!hover.matches||reduce.matches){reset();return;}
    const target=event.target.closest?.(selector);
    if(!target||!root.contains(target)||target.disabled||target.closest('[inert],.theme-surface')){reset();return;}
    if(target!==active){reset();active=target;bounds=target.getBoundingClientRect();}
    if(!bounds.width||!bounds.height){reset();return;}
    pending={x:event.clientX,y:event.clientY};
    if(frame===null)frame=window.requestAnimationFrame(paint);
  }
  listen(root,'pointermove',move,{passive:true});
  listen(root,'pointerleave',reset);listen(root,'pointercancel',reset);
  listen(document,'scroll',reset,{capture:true,passive:true});
  listen(document,'visibilitychange',reset);listen(window,'blur',reset);listen(window,'pagehide',reset);listen(window,'resize',reset,{passive:true});
  if(hover.addEventListener)listen(hover,'change',reset);
  if(reduce.addEventListener)listen(reduce,'change',reset);
  return ()=>{disposed=true;reset();listeners.forEach(remove=>remove());};
}

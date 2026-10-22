// Reserve the final number's width before counting; font weight changes stay
// inside that space. Cancelling or reducing motion always restores the result.
export function animateScore(el,value,{window,reducedMotion=()=>false,onComplete=()=>{}}) {
  let frame=null,stopped=false;
  const originalWidth=el.style.minWidth;
  function finish(completed=false){
    if(stopped)return;stopped=true;
    if(frame!==null)window.cancelAnimationFrame(frame);frame=null;
    el.textContent=String(value);el.style.minWidth=originalWidth;el.style.removeProperty('--score-weight');
    if(completed&&el.isConnected&&!reducedMotion())onComplete();
  }
  if(reducedMotion()){finish();return finish;}
  el.textContent=String(value);el.style.minWidth=`${el.getBoundingClientRect().width}px`;
  const start=window.performance.now(),decimals=Number.isInteger(value)?0:1,precision=10**decimals;
  el.textContent=decimals?'0.0':'0';el.style.setProperty('--score-weight','350');
  function tick(now){
    frame=null;
    if(stopped)return;
    if(!el.isConnected||reducedMotion()){finish();return;}
    const progress=Math.max(0,Math.min(1,(now-start)/850)),ease=1-(1-progress)**3;
    if(progress===1){finish(true);return;}
    const text=(Math.floor(value*ease*precision)/precision).toFixed(decimals);
    if(el.textContent!==text)el.textContent=text;
    el.style.setProperty('--score-weight',(350+270*ease).toFixed(1));
    frame=window.requestAnimationFrame(tick);
  }
  frame=window.requestAnimationFrame(tick);
  return ()=>finish();
}

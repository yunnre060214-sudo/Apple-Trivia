import {ICON_MOTIONS} from './icon-motion.mjs?v=3.5.0';
// A small, delegated motion system. Intent, contact, state and completion have
// separate channels; no interaction waits for a decorative animation to finish.
// Tuple: pressed scale X/Y, displacement X/Y in px, rotation in degrees,
// release duration in ms. Repeated controls derive a stable small variation.
export const MOTION_PROFILES = Object.freeze({
  brand:[.955,.98,0,-.4,-2,360], about:[.96,.99,0,1,0,260], tally:[.98,.93,0,.6,0,300],
  appearance:[.9,.9,0,0,-8,380], launch:[.975,.94,0,1.3,0,370], custom:[.97,.965,0,1,-.7,330],
  resume:[.98,.95,-1,0,0,340], product:[.96,.9,0,1,0,310], 'archive-prev':[.91,.97,-2,0,0,290], 'archive-next':[.97,.91,2,0,0,320], 'archive-playback':[.88,.96,0,.7,-4,340],
  'topic-surprise':[.99,.965,0,1,-.25,390], 'topic-stories':[.99,.98,1,0,.2,350], 'topic-timeline':[.995,.96,0,.7,0,410],
  home:[.97,.95,-1.5,0,0,280], 'home-return':[.95,.99,0,.7,0,300], map:[.92,.92,0,0,2,330], flag:[.88,.94,0,1,-5,370],
  answer:[.995,.966,0,.8,0,260], previous:[.98,.97,-1,0,0,280], advance:[.975,.96,1,0,0,340], 'quick-next':[.95,.95,1.5,0,0,290],
  confirm:[.97,.93,0,1.4,0,350], explain:[.96,.96,0,.7,0,300], end:[.98,.94,0,1,0,330], finish:[.98,.93,0,-1,0,420],
  replay:[.955,.955,0,0,1.4,400], restart:[.96,.96,-.8,0,0,350], 'share-card':[.96,.94,0,-1,0,370],
  review:[.97,.94,0,.5,0,320], results:[.96,.95,-1,0,0,310], save:[.95,.93,0,1.4,0,360], native:[.96,.93,0,-1.2,0,400],
  copy:[.94,.98,1,0,0,330], rehello:[.98,.92,0,.8,-.7,420], reload:[.94,.94,0,0,-4,360], dismiss:[.84,.84,0,0,-13,300],
  continue:[.98,.94,-1,0,0,280], submit:[.97,.945,0,1,0,380], count:[.92,.91,0,1,0,300], category:[.965,.925,0,.5,.35,320],
  jump:[.88,.88,0,1.3,0,290], external:[.96,.98,1.1,0,0,320], repository:[.97,.94,0,-.5,0,350], source:[.98,.92,0,1.4,0,290],
  footer:[.95,.95,1,-1,0,340], skip:[.98,.96,0,0,0,220], disclosure:[.997,.975,0,.6,0,330],
  auto:[1,1,0,0,0,350], number:[1,1,0,0,0,200], 'select-difficulty':[1,1,0,0,0,260], 'select-mode':[1,1,0,0,0,310], 'select-timer':[1,1,0,0,0,340], 'copy-field':[1,1,0,0,0,200], control:[.97,.96,0,1,0,280],
});
const SELECTOR = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button][tabindex]';
const EASE = 'cubic-bezier(.2,.8,.25,1)', SETTLE = 'cubic-bezier(.18,.9,.25,1)';
const hash = text => [...String(text)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);

export function describeMotion(el) {
  const d=el.dataset, tag=el.tagName.toLowerCase(), has=c=>el.classList.contains(c);
  let kind='control', suffix='';
  if (d.device) { kind='product'; suffix=d.device; }
  else if (d.archivePlayback !== undefined) kind='archive-playback';
  else if (d.archiveStep) kind=Number(d.archiveStep)<0?'archive-prev':'archive-next';
  else if (d.answer!==undefined) { kind='answer'; suffix=d.answer; }
  else if (d.count) { kind='count'; suffix=d.count; }
  else if (d.jump!==undefined) { kind='jump'; suffix=d.jump; }
  else if (d.topic) kind=`topic-${d.topic}`;
  else if (d.action) {
    const action=d.action;
    const actions={theme:'appearance',custom:'custom',resume:'resume',flag:'flag',map:'map',previous:'previous',confirm:'confirm',explain:'explain','end-round':'end',finish:'finish',results:'results',review:'review','share-card':'share-card',download:'save','native-share':'native',copy:'copy','replay-hello':'rehello',reload:'reload'};
    if (action==='quick') kind=has('hero-start')?'launch':el.closest('.result-actions')?'replay':'restart';
    else if (action==='home') kind=has('back-button')?'home':'home-return';
    else if (action==='about') kind=has('bank-count')?'tally':'about';
    else if (action==='next') kind=has('quick-next')?'quick-next':'advance';
    else if (action==='close') kind=has('modal-close')?'dismiss':'continue';
    else kind=actions[action]||'control';
  } else if (tag==='a') {
    kind=has('brand')?'brand':has('skip-link')?'skip':el.closest('.source-links')?'source':el.closest('.site-footer')?'footer':el.closest('#modal-content')?'repository':'external';
    suffix=String(hash(el.getAttribute('href'))%997);
  } else if (tag==='summary') { kind='disclosure'; suffix=String(hash(el.textContent)%997); }
  else if (tag==='select') kind=`select-${el.name==='difficulty'?'difficulty':el.name==='mode'?'mode':'timer'}`;
  else if (tag==='textarea') kind='copy-field';
  else if (tag==='input') { kind=el.id==='auto-toggle'?'auto':el.type==='checkbox'?'category':'number'; suffix=el.value||el.name; }
  else if (el.type==='submit') kind='submit';
  // The switch uses native CSS geometry and a distinct state response.
  const profile=MOTION_PROFILES[kind]||MOTION_PROFILES.control;
  const id=suffix?`${kind}-${suffix}`:kind, variation=hash(id)%7;
  return {kind,id,variation,profile};
}

export function createInteractionMotion({document,window,reducedMotion=()=>false}) {
  const active=new Set(), channels=new WeakMap(), states=new WeakMap(), feedbacks=new Map(), disclosures=new Map();
  const listeners=[];
  let held, disposed=false, observer;
  const reduced=()=>disposed||reducedMotion();
  const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  function cancel(record, finish=false) {
    if (!record || !active.has(record)) return;
    active.delete(record);if(channels.get(record.el)?.get(record.channel)===record)channels.get(record.el).delete(record.channel);
    record.animation.cancel();if(finish)record.done?.();
  }
  function run(el,channel,keyframes,{duration=300,delay=0,easing=EASE,done,hold=false}={}) {
    if(!el?.isConnected||reduced()||typeof el.animate!=='function'){done?.();return;}
    if(!channels.has(el))channels.set(el,new Map());
    cancel(channels.get(el).get(channel));
    try {
      const animation=el.animate(keyframes,{duration,delay,easing,fill:'both'});
      const record={el,channel,animation,done};active.add(record);channels.get(el).set(channel,record);
      if(animation.finished)animation.finished.then(()=>{if(!hold)cancel(record,true);},()=>cancel(record));
      else cancel(record,true);
      return record;
    } catch {done?.();}
  }
  function control(target, labels=true) {
    if(!target?.closest)return null;
    const el=target.closest(SELECTOR);
    return el || (labels?target.closest('label')?.querySelector('input,select,textarea'):null);
  }
  function surface(el) {return el.matches('input[type=checkbox]')&&el.id!=='auto-toggle'?el.closest('label')?.querySelector('span')||el:el;}
  function blocked(el) {return !el||el.disabled||el.getAttribute('aria-disabled')==='true'||el.closest('[inert]')||el.closest('.theme-surface')||document.documentElement.classList.contains('hello-pending');}
  function snapshot(el) {
    const style=window.getComputedStyle(el);
    return {scale:style.scale&&style.scale!=='none'?style.scale:'1',translate:style.translate&&style.translate!=='none'?style.translate:'0px 0px',rotate:style.rotate&&style.rotate!=='none'?style.rotate:'0deg'};
  }
  function decorate(el) {
    if (el.closest?.('.theme-surface')) return;
    const info=describeMotion(el);
    if(el.dataset.motion!==info.kind)el.dataset.motion=info.kind;
    if(el.dataset.motionId!==info.id)el.dataset.motionId=info.id;
    el.style.setProperty('--motion-variant',String(info.variation));
    if(!states.has(el))states.set(el,state(el));
    if(el.tagName==='SELECT'&&!el.parentElement.classList.contains('motion-select')) {
      const wrap=document.createElement('span');wrap.className='motion-select';el.before(wrap);wrap.append(el);
      const arrow=document.createElement('span');arrow.className='motion-select-arrow';arrow.setAttribute('aria-hidden','true');wrap.append(arrow);
    }
    return info;
  }
  function state(el) {return {pressed:el.getAttribute('aria-pressed'),correct:el.classList.contains('correct'),wrong:el.classList.contains('wrong'),disabled:el.disabled};}
  function refresh(scope=document) {
    if(scope.closest?.('.theme-surface'))return;
    if(scope.matches?.(SELECTOR))decorate(scope);
    scope.querySelectorAll?.(SELECTOR).forEach(decorate);
    const groups=[...(scope.matches?.('.segments')?[scope]:[]),...(scope.querySelectorAll?.('.segments')||[])];
    groups.filter(group=>!group.closest('.theme-surface')).forEach(group=>segment(group,false));
  }
  function press(el,event) {
    if(blocked(el)||reduced())return;
    release(true);
    const info=decorate(el),node=surface(el);
    if(/^(number|select-|copy-field|auto)/.test(info.kind))return;
    const [sx,sy,x,y,r]=info.profile;
    const from=snapshot(node);cancel(channels.get(node)?.get('entry'));
    const end={scale:`${sx} ${sy}`,translate:`${x}px ${y}px`,rotate:`${r}deg`};
    const animation=run(node,'contact',[from,end],{duration:90,hold:true});
    held={el,node,info,animation,end,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId};
    // A visual contraction must not lose an edge click. No default navigation
    // is prevented; a scroll/cancel releases this capture before completion.
    if(Number.isFinite(event.pointerId))try{el.setPointerCapture?.(event.pointerId);}catch{}
    el.dataset.motionPressed='';
  }
  function release(cancelled=false) {
    if(!held)return;
    const {el,node,info,pointerId}=held,from=snapshot(node);held=null;
    if(Number.isFinite(pointerId))try{if(el.hasPointerCapture?.(pointerId))el.releasePointerCapture(pointerId);}catch{}
    delete el.dataset.motionPressed;cancel(channels.get(node)?.get('contact'));
    const amount=cancelled?1:1.005+info.variation*.0008;
    run(node,'contact',[from,{scale:`${amount} ${cancelled?1:1.008}`,translate:'0px 0px',rotate:'0deg',offset:.58},{scale:'1',translate:'0px 0px',rotate:'0deg'}],{duration:cancelled?160:info.profile[5]+info.variation*7,easing:SETTLE});
  }
  function animateGlyph(icon,mode='activate') {
    if(!icon?.isConnected||reduced())return;
    const recipe=ICON_MOTIONS[icon.dataset.icon];
    recipe?.forEach(({part,frames,duration,delay,origin='12px 12px'})=>{
      const node=icon.querySelector(`[data-icon-part="${part}"]`);if(!node)return;
      const channel='glyph-part';
      const keyframes=frames.map(frame=>({...frame,transformOrigin:origin}));
      // Rapid repeats continue from the painted pose, with one live track per
      // part. A fresh gesture never queues behind an earlier gesture.
      if(channels.get(node)?.has(channel)) {
        const current=window.getComputedStyle(node);
        for(const key of Object.keys(frames[0]))if(current[key])keyframes[0][key]=current[key];
      }
      run(node,channel,keyframes,{duration:duration*(mode==='focus'?.85:1),delay});
    });
  }
  function iconMotion(el,mode='activate') {
    if(blocked(el)||reduced())return;
    decorate(el);
    // A control can contain more than one symbol (e.g. shuffle + arrow).
    el.querySelectorAll('.icon[data-icon]').forEach(icon=>{
      if(icon.closest('a,button,summary')!==el)return;
      animateGlyph(icon,mode);
    });
  }
  function activate(el) {
    if(blocked(el)||reduced())return;
    const info=decorate(el);
    if(info.kind==='count')segment(el.closest('.segments'),true,el);
    if(!['number','copy-field','category','auto'].includes(info.kind))iconMotion(el);
  }
  function segment(group,animated,selected) {
    if(!group)return;
    let marker=group.querySelector('.motion-segment');
    const button=selected||group.querySelector('button[aria-pressed=true]');
    if(!marker){marker=document.createElement('span');marker.className='motion-segment';marker.setAttribute('aria-hidden','true');group.prepend(marker);group.dataset.motionSegments='';}
    marker.hidden=!button;if(!button)return;
    if(animated&&marker.dataset.selected===button.dataset.count)return;
    marker.dataset.selected=button.dataset.count;
    const from=marker.getBoundingClientRect(),box=group.getBoundingClientRect(),to=button.getBoundingClientRect();
    if(!to.width||!to.height)return;
    Object.assign(marker.style,{left:`${to.left-box.left+group.scrollLeft}px`,top:`${to.top-box.top+group.scrollTop}px`,width:`${to.width}px`,height:`${to.height}px`});
    if(animated&&from.width)run(marker,'segment',[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'translate(0px,0px) scale(1)'}],{duration:350,easing:SETTLE});
  }
  function changed(el) {
    if(!el.isConnected||el.closest?.('.theme-surface')||!el.matches?.(SELECTOR))return;
    const before=states.get(el);decorate(el);const after=state(el);states.set(el,after);
    if(!before)return;
    const info=describeMotion(el);
    if(before.pressed!==after.pressed) {
      if(info.kind==='count')segment(el.closest('.segments'),true);
      if(info.kind==='answer'&&after.pressed==='true')run(el.querySelector('.letter'),'selection',[{scale:'.76',rotate:'-8deg'},{scale:'1.12',rotate:'2deg',offset:.6},{scale:'1',rotate:'0deg'}],{duration:300});
    }
    if(info.kind==='answer'&&((after.correct&&!before.correct)||(after.wrong&&!before.wrong))) {
      const letter=el.querySelector('.letter');
      run(letter,'selection',after.correct?[{scale:'.84'},{scale:'1.15',offset:.55},{scale:'1'}]:[{translate:'0px 0px'},{translate:'-2px 0px',offset:.2},{translate:'2px 0px',offset:.45},{translate:'-1px 0px',offset:.7},{translate:'0px 0px'}],{duration:after.correct?360:250});
    }
    if(before.disabled&&!after.disabled)run(surface(el),'enabled',[{opacity:.55,scale:'.985'},{opacity:1,scale:'1'}],{duration:240});
  }
  function enter(scope,kind='content') {
    if(!scope||reduced()||document.documentElement.classList.contains('hello-pending'))return;
    refresh(scope);
    if(kind==='result'||kind==='feedback')scope.querySelectorAll('.result-emblem .icon,.feedback-line>.icon').forEach(icon=>animateGlyph(icon));
    const selector=kind==='answers'?'.answer':kind==='dialog'?'#modal-content>h2,#modal-content>p,#modal-content>form>fieldset,#modal-content>form>.form-row,#modal-content>form>.timer-setting,#modal-content>form>[type=submit],.map-grid,.share-preview,.share-buttons,.dialog-actions,.replay-intro':kind==='explanation'?'.explanation p,.source-links a':'.result-actions>button,.result-links>button';
    const nodes=[...scope.querySelectorAll(selector)].filter(el=>!el.hidden).slice(0,16);
    nodes.forEach((el,i)=>run(el,'entry',[{opacity:0,translate:kind==='answers'?'5px 0px':'0px 6px'},{opacity:1,translate:'0px 0px'}],{duration:kind==='dialog'?340:300,delay:i*(kind==='answers'?24:28)}));
  }
  function prepareDialog(dialog) {cancel(channels.get(dialog)?.get('dialog-close'));delete dialog.dataset.motionClosing;}
  function closeDialog(dialog) {
    if(!dialog.open)return;
    if(dialog.dataset.motionClosing!==undefined)return;
    dialog.dataset.motionClosing='';
    const mobile=window.matchMedia('(max-width:760px)').matches;
    run(dialog,'dialog-close',[{opacity:1,translate:'0px 0px',scale:'1'},{opacity:0,translate:`0px ${mobile?24:8}px`,scale:mobile?'1':'.985'}],{duration:mobile?190:150,easing:'cubic-bezier(.4,0,1,1)',done:()=>{delete dialog.dataset.motionClosing;dialog.close();}});
  }
  function disclosure(summary,event) {
    const details=summary.closest('details');if(!details||reduced()||typeof details.animate!=='function')return;
    event.preventDefault();
    const old=disclosures.get(details),opening=old?!old.opening:!details.open;
    const from=details.getBoundingClientRect().height;
    if(old)cancel(old.animation);
    details.open=true;details.dataset.motionDisclosing='';details.toggleAttribute('data-motion-collapsing',!opening);
    const to=opening?details.getBoundingClientRect().height:summary.getBoundingClientRect().height+1;
    const record={opening};disclosures.set(details,record);
    record.animation=run(details,'disclosure',[{height:`${from}px`},{height:`${to}px`}],{duration:opening?330:240,done:()=>{
      if(disclosures.get(details)!==record)return;
      details.open=opening;delete details.dataset.motionDisclosing;delete details.dataset.motionCollapsing;disclosures.delete(details);
    }});
    if(opening)run(details.querySelector('.review-body'),'disclosure-body',[{opacity:0,translate:'0px -4px'},{opacity:1,translate:'0px 0px'}],{duration:280,delay:40});
  }
  function feedback(el) {
    if(!el?.isConnected)return;
    feedbacks.get(el)?.restore();
    const original=el.querySelector('.icon');if(!original)return;
    const check=document.createElementNS('http://www.w3.org/2000/svg','svg');check.setAttribute('class','icon motion-status-icon');check.setAttribute('viewBox','0 0 24 24');check.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','m5 12 4 4L19 6');check.append(path);
    original.replaceWith(check);el.dataset.motionFeedback='success';
    let timer;const restore=()=>{window.clearTimeout(timer);if(check.parentNode===el)check.replaceWith(original);delete el.dataset.motionFeedback;feedbacks.delete(el);};
    feedbacks.set(el,{restore});timer=window.setTimeout(restore,1400);
    const kind=describeMotion(el).kind;
    run(check,'success',[{opacity:0,scale:'.6',translate:kind==='save'?'0px -5px':kind==='native'?'0px 5px':'-3px 0px'},{opacity:1,scale:'1.15',translate:'0px 0px',offset:.65},{opacity:1,scale:'1',translate:'0px 0px'}],{duration:400});
  }
  function settle() {
    release(true);[...active].forEach(record=>cancel(record,true));
    feedbacks.forEach(record=>record.restore());
    document.querySelectorAll('.motion-select[data-open]').forEach(el=>delete el.dataset.open);
  }
  refresh();
  listen(document,'pointerdown',event=>{if(event.button!==0||event.isPrimary===false)return;const el=control(event.target);if(el?.tagName==='SELECT'&&!blocked(el)){document.querySelectorAll('.motion-select[data-open]').forEach(w=>{if(w!==el.parentElement)delete w.dataset.open;});el.parentElement.toggleAttribute('data-open');}else document.querySelectorAll('.motion-select[data-open]').forEach(w=>delete w.dataset.open);press(el,event);},{capture:true,passive:true});
  listen(document,'pointermove',event=>{if(held?.pointerId===event.pointerId&&Math.hypot(event.clientX-held.startX,event.clientY-held.startY)>10)release(true);},{passive:true});
  listen(document,'pointerup',()=>release(),true);listen(document,'pointercancel',()=>release(true),true);
  listen(document,'lostpointercapture',event=>{if(held?.pointerId===event.pointerId)release(true);},true);
  listen(document,'click',event=>{const el=control(event.target,false);if(blocked(el))return;if(el.tagName==='SUMMARY')disclosure(el,event);activate(el);},true);
  listen(document,'keydown',event=>{const el=control(event.target,false);if(!el)return;if(el.tagName==='SELECT'&&['Escape','Enter'].includes(event.key))delete el.parentElement.dataset.open;else if(el.tagName==='SELECT'&&['ArrowDown','ArrowUp',' '].includes(event.key))el.parentElement.dataset.open='';if(!event.repeat&&['Enter',' '].includes(event.key)&&!el.matches('input,select,textarea'))press(el,event);},true);
  listen(document,'keyup',event=>{if(['Enter',' '].includes(event.key))release();},true);
  const hover=window.matchMedia('(hover:hover) and (pointer:fine)');
  listen(document,'pointerover',event=>{
    if(!hover.matches||event.pointerType==='touch')return;
    const el=control(event.target,false);
    if(el&&!blocked(el)&&(!event.relatedTarget||!el.contains(event.relatedTarget)))iconMotion(el,'hover');
  },{passive:true});
  listen(document,'focusin',event=>{const el=control(event.target,false);if(el&&!blocked(el)&&el.matches(':focus-visible'))iconMotion(el,'focus');});
  listen(document,'focusout',event=>{const el=control(event.target,false);if(el?.tagName==='SELECT')delete el.parentElement.dataset.open;release(true);});
  listen(document,'change',event=>{const el=control(event.target,false);if(!el)return;if(el.tagName==='SELECT'){delete el.parentElement.dataset.open;run(el,'choice',[{opacity:.65},{opacity:1}],{duration:260});}else if(el.type==='checkbox'){const node=surface(el);if(el.id!=='auto-toggle')run(node,'choice',[{scale:'.94'},{scale:'1.035',offset:.6},{scale:'1'}],{duration:310});}});
  listen(document,'cancel',event=>{if(event.target.tagName==='DIALOG'&&!reduced()){event.preventDefault();closeDialog(event.target);}},true);
  listen(document,'close',event=>{if(event.target.tagName==='DIALOG')prepareDialog(event.target);},true);
  listen(window,'blur',()=>release(true));listen(window,'pagehide',settle);
  listen(document,'visibilitychange',()=>{if(document.hidden)settle();});
  listen(window,'resize',()=>document.querySelectorAll('.segments').forEach(group=>segment(group,false)),{passive:true});
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.addEventListener)listen(preference,'change',event=>{if(event.matches)settle();});
  if(window.MutationObserver) {
    observer=new window.MutationObserver(records=>{
      records.forEach(record=>{
        if(record.target.closest?.('.theme-surface'))return;
        if(record.type==='attributes')changed(record.target);
        else {
          record.addedNodes.forEach(node=>{if(node.nodeType===1&&node.isConnected)refresh(node);});
          record.removedNodes.forEach(node=>{if(node.nodeType!==1)return;[...active].forEach(a=>{if(node===a.el||node.contains(a.el))cancel(a);});disclosures.forEach((d,el)=>{if(node===el||node.contains(el))disclosures.delete(el);});feedbacks.forEach((f,el)=>{if(node===el||node.contains(el))f.restore();});});
        }
      });
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','disabled','data-action','class']});
  }
  return {refresh,enter,activate,feedback,closeDialog,prepareDialog,settle,dispose(){settle();disposed=true;observer?.disconnect();listeners.forEach(remove=>remove());}};
}

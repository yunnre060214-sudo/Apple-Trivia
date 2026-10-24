import {homeMarkup,questionMarkup,resultMarkup,reviewMarkup,esc} from './views.mjs';
import {createStorage,STORAGE_KEY} from './storage.mjs';
import {mountQuestionMedia} from './question-media.mjs';
import {challengeURL,readChallenge,challengeFromHash} from '../src/challenge.mjs';
import {VERSION,CATEGORIES,LEVELS,drawQuestions,filterBank,createSession,hydrateSession,grade,updateRecent,resultTitle,easterEggs} from '../src/engine.mjs?v=__VERSION__';
import {icon} from './icons.mjs?v=__VERSION__';
import {mountArchive} from './gallery.mjs?v=__VERSION__';
import {mountHome,questionFromHash} from './home.mjs?v=__VERSION__';
import {clearQuestionUrl,questionRouteChange,followsInPlace,quizShortcut} from './navigation.mjs?v=__VERSION__';
import {replayHello} from './hello.mjs?v=__VERSION__';
import {createThemeSwitcher,setBrowserTheme} from './theme.mjs?v=__VERSION__';
import {SITE_URL,shareText,createSharePreview,downloadBlob,resultPalette} from './share.mjs?v=__VERSION__';
import {createInteractionMotion} from './motion.mjs?v=__VERSION__';
import {mountSurfacePointer} from './surface.mjs?v=__VERSION__';
import {animateScore} from './score.mjs?v=__VERSION__';
const $=s=>document.querySelector(s), main=$('#main'), modal=$('#modal');
const KEY=STORAGE_KEY;
const {read,write,remove}=createStorage({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)},{onError:()=>toast('浏览器无法保存进度')});
const arr=v=>Array.isArray(v)?v:[];
const initial={count:20,difficulty:'mixed',categories:Object.keys(CATEGORIES),mode:'exam',secondsPerQuestion:0};
let config={...initial,...read('config',{})};
config.categories=arr(config.categories).filter(c=>CATEGORIES[c]);if(!config.categories.length)config.categories=[...initial.categories];
if(!['mixed',...Object.keys(LEVELS)].includes(config.difficulty))config.difficulty='mixed';
if(!['quick','exam','practice'].includes(config.mode))config.mode='exam';
config.count=Math.min(500,Math.max(5,Math.floor(Number(config.count)||20)));
if(![0,30,60,90].includes(Number(config.secondsPerQuestion)))config.secondsPerQuestion=0;
let bank=[], questions=[], session=null, report=null, view='home', seen=arr(read('seen',[])).filter(x=>typeof x==='string');
let pendingChallenge=null;
let autoTimer, clockTimer, toastTimer, celebrationTimer, generation=0, paused=false, finishPending=false;
const sharePreview=createSharePreview();
let disposeArchive=()=>{}, questionDirection=1;
let disposeAnswerSurface=()=>{},disposeShareSurface=()=>{},shareTheme='light';
let stopScore=()=>{},disposeMedia=()=>{};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const motion=createInteractionMotion({document,window,reducedMotion:reduced});
const fmt=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const quickConfig=topic=>({count:5,difficulty:'mixed',categories:Object.keys(CATEGORIES),mode:'quick',casual:true,secondsPerQuestion:0,...(topic?{topic}: {})});
const sourceLinks=q=>q.sources.map((s,i)=>`<a href="${esc(s)}" target="_blank" rel="noopener noreferrer">${s.includes('macrumors.com')?'历史声明存档':'Apple 资料'}${q.sources.length>1?` ${i+1}`:''}${icon('external')}</a>`).join('');
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function clearShareSurface(){disposeShareSurface();disposeShareSurface=()=>{};}
function dialog(title,body){clearShareSurface();sharePreview.clear();motion.prepareDialog(modal);$('#modal-content').innerHTML=`<h2 id="modal-title">${title}</h2>${body}`;if(!modal.open)modal.showModal();motion.enter(modal,'dialog');}
function cancelAuto(){clearTimeout(autoTimer);autoTimer=null;generation++;$('.quick-controls')?.classList.remove('counting');}
function save(){if(session&&!finishPending)write('session',session);}
function visit(q){seen=updateRecent(seen,[q.id],Math.max(3000,Math.floor(bank.length*.75)));write('seen',seen);}
function enter(next){disposeMedia();disposeMedia=()=>{};stopScore();disposeArchive();disposeArchive=()=>{};disposeAnswerSurface();disposeAnswerSurface=()=>{};clearShareSurface();switchTheme.settle();sharePreview.clear();modal.close();view=next;document.body.dataset.view=next;cancelAuto();clearInterval(clockTimer);clearTimeout(celebrationTimer);$('#celebration').replaceChildren();if(!document.documentElement.classList.contains('hello-pending'))main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
function animate(el,{x=0,y=8,duration=260}={}){if(!reduced())el?.animate([{opacity:0,transform:`translate(${x}px,${y}px)`},{opacity:1,transform:'translate(0,0)'}],{duration,easing:'cubic-bezier(.22,1,.36,1)'});}
function home(){
  pendingChallenge=null;clearQuestionUrl(window);
  enter('home');
  const saved=hydrateSession(read('session',null),bank);
  main.innerHTML=homeMarkup({saved,bank,VERSION});
  const archiveCleanup=mountArchive($('.archive'),{reducedMotion:reduced});
  const homeCleanup=mountHome(main,{document,window});
  const topicCleanup=mountSurfacePointer($('.topic-grid'),{document,window,selector:'.topic-link'});
  disposeArchive=()=>{archiveCleanup();homeCleanup();topicCleanup();};
}
function custom(){
  dialog('自定义',`<form id="custom-form"><fieldset><legend>题数</legend><div class="segments counts">${[5,10,20,50,100,200,500].map(n=>`<button type="button" data-count="${n}" aria-pressed="${config.count===n}" class="${config.count===n?'selected':''}">${n}</button>`).join('')}</div><label class="custom-number">自定题数<input name="count" id="count-input" type="number" min="5" max="500" value="${config.count}" required inputmode="numeric"></label></fieldset><div class="form-row"><label>难度<select name="difficulty">${[['mixed','混合'],['easy','简单'],['medium','中等'],['hard','困难'],['expert','专家']].map(([v,t])=>`<option value="${v}" ${config.difficulty===v?'selected':''}>${t}</option>`).join('')}</select></label><label>玩法<select name="mode" id="mode-select">${[['quick','选完自动下一题'],['exam','自由切题，最后揭晓'],['practice','每题确认，随时看解析']].map(([v,t])=>`<option value="${v}" ${config.mode===v?'selected':''}>${t}</option>`).join('')}</select></label></div><fieldset><legend>领域<span class="muted">可多选</span></legend><div class="category-pills">${Object.entries(CATEGORIES).map(([id,c])=>`<label><input type="checkbox" name="category" value="${id}" ${config.categories.includes(id)?'checked':''}><span>${c.name}</span></label>`).join('')}</div></fieldset><label class="timer-setting" ${config.mode!=='exam'?'hidden':''}>限时<select name="timer">${[[0,'不限时'],[30,'总时间 = 题数 × 30 秒'],[60,'总时间 = 题数 × 60 秒'],[90,'总时间 = 题数 × 90 秒']].map(([v,t])=>`<option value="${v}" ${Number(config.secondsPerQuestion)===v?'selected':''}>${t}</option>`).join('')}</select></label><p id="pool-hint" class="muted" aria-live="polite"></p><button type="submit" class="primary-button full-width">开始${icon('arrow')}</button></form>`);updatePool();
}
function formConfig(){const f=$('#custom-form'),data=new FormData(f);return {count:Number(data.get('count')),difficulty:data.get('difficulty'),mode:data.get('mode'),categories:data.getAll('category'),secondsPerQuestion:Number(data.get('timer'))};}
function updatePool(){const f=$('#custom-form');if(!f)return;const c=formConfig(),n=filterBank(bank,c).length;$('#pool-hint').textContent=n?`可选 ${n.toLocaleString('en-US')} 题${n<c.count?`，这局玩 ${n} 题`:''}`:'请选择至少一个领域';f.querySelector('[type="submit"]').disabled=!n;}
function start(next){
  if(!bank.length)return;
  cancelAuto();modal.close();const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  questions=drawQuestions(bank,next,seed,seen);if(!questions.length){toast('该分类暂无题目');return;}
  if(!next.gallery)clearQuestionUrl(window);
  session=createSession(questions,{...next,count:questions.length},seed);questionDirection=1;report=null;finishPending=false;save();quiz();
}
function challengeLanding(token){
  const parsed=readChallenge(token,bank);pendingChallenge=parsed.ok?parsed:null;
  enter('challenge');
  if(!parsed.ok){main.innerHTML=`<section class="challenge-shell"><span class="challenge-overline">同题挑战</span><h1>这组题暂时无法打开</h1><p>${parsed.reason==='expired'?'题目内容已更新，请让朋友重新分享。':parsed.reason==='version'?'这份挑战使用了不同的格式，请重新获取链接。':'链接不完整或格式有误，请重新复制。'}</p><button class="primary-button" data-action="home">回到首页${icon('arrow')}</button></section>`;return;}
  const saved=hydrateSession(read('session',null),bank),resumable=saved?.config.challenge===token;
  main.innerHTML=`<section class="challenge-shell"><span class="challenge-overline">同题挑战</span><h1>同一组题，<br>换你来猜。</h1><div class="challenge-count"><strong>${parsed.questions.length}</strong><span>题</span></div><p>题目与选项顺序一致，完成后统一揭晓。</p><div class="challenge-actions">${resumable?`<button class="primary-button" data-action="resume">接着上次玩${icon('arrow')}</button>`:''}<button class="${resumable?'secondary-button':'primary-button'}" data-action="challenge-start">${resumable?'重新开始':'开始挑战'}${icon('arrow')}</button><button class="text-button" data-action="home">回到首页</button></div></section>`;
}
function startChallenge(){
  if(!pendingChallenge)return;
  const {questions:fixed,token}=pendingChallenge;
  questions=fixed;session=createSession(questions,{count:questions.length,mode:'exam',secondsPerQuestion:0,challenge:token},0);questionDirection=1;report=null;finishPending=false;save();quiz();
}
function route(){
  const token=challengeFromHash(location.hash);
  if(token!==null){challengeLanding(token);return;}
  const id=questionFromHash(location.hash);if(!id||!startGalleryQuestion(id,{updateUrl:false}))home();
}
function startGalleryQuestion(id,{updateUrl=true}={}) {
  if(!bank.some(q=>q.id===id))return false;
  start({count:1,difficulty:'mixed',categories:Object.keys(CATEGORIES),mode:'practice',secondsPerQuestion:0,ids:[id],gallery:true});
  if(updateUrl)history.pushState(null,'',`#q=${encodeURIComponent(id)}`);
  return true;
}
function resume(){modal.close();const s=hydrateSession(read('session',null),bank);if(!s){remove('session');toast('进度已过期');home();return;}questions=s.hydratedQuestions;delete s.hydratedQuestions;session=s;report=null;finishPending=false;if(!s.config.gallery)clearQuestionUrl(window);if(s.deadline&&s.deadline<=Date.now()){finish(true);return;}quiz();}
function quiz(){
  enter('quiz');const quick=session.config.mode==='quick';
  main.innerHTML=`<section class="quiz-shell"><div class="quiz-top"><button class="back-button" data-action="home">${icon('back')}返回</button><span class="round-label">${session.config.gallery?'画廊考点':session.config.challenge?'同题挑战':quick?'快速模式':'自定义'}<span id="quiz-clock" ${quick?'hidden':''}></span></span><button class="icon-button" data-action="map" aria-label="打开题目导航" ${quick?'hidden':''}>${icon('grid')}</button></div><div class="progress-row"><div class="progress-track" role="progressbar" aria-label="本局进度" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="0"><span></span></div><span id="progress-label"></span></div><div id="question-stage"></div>${quick?'':'<p class="keyboard-note">1 至 4 选答案 · 方向键切题 · Enter 继续</p>'}</section>`;
  renderQuestion();clock();if(view==='quiz'&&!quick)clockTimer=setInterval(clock,1000);
}
function renderQuestion(){
  disposeMedia();disposeAnswerSurface();
  cancelAuto();paused=false;const q=questions[session.index],answer=session.answers[q.id],quick=session.config.mode==='quick';visit(q);
  const locked=session.confirmed.includes(q.id);
  $('#question-stage').innerHTML=questionMarkup({q,answer,quick,locked,session,read,questions});
  disposeMedia=mountQuestionMedia(main);
  updateOptions();updateProgress();if(locked)showFeedback(false);animate($('.question-card'),{x:questionDirection*14,y:0,duration:240});motion.enter($('.answers'),'answers',{direction:questionDirection});
  $('#question-prompt').focus({preventScroll:true});
  disposeAnswerSurface=mountSurfacePointer($('.answers'),{document,window});
}
// Selection changes four option nodes and the progress label. The shell, navigation and prompt survive.
function selectAnswer(index){
  if(view!=='quiz'||!session)return;const q=questions[session.index];if(session.confirmed.includes(q.id)||!q.options[index])return;
  if(session.deadline&&session.deadline<=Date.now()){finish(true);return;}
  session.answers[q.id]=q.options[index];
  if(session.config.mode==='quick')session.confirmed.push(q.id);
  save();updateOptions();updateProgress();
  if(session.config.mode==='quick')showFeedback(true);
}
function updateOptions(){
  const q=questions[session.index],answer=session.answers[q.id],locked=session.confirmed.includes(q.id);
  main.querySelectorAll('[data-answer]').forEach((b,i)=>{const o=q.options[i];b.classList.toggle('selected',answer===o);b.classList.toggle('correct',locked&&o===q.answer);b.classList.toggle('wrong',locked&&answer===o&&o!==q.answer);b.classList.toggle('dimmed',locked&&o!==answer&&o!==q.answer);b.setAttribute('aria-pressed',String(answer===o));b.disabled=locked;b.querySelector('.answer-mark').innerHTML=locked&&o===q.answer?`${icon('check')}<span class="sr-only">正确答案</span>`:locked&&o===answer?`${icon('close')}<span class="sr-only">回答错误</span>`:answer===o?`${icon('check')}<span class="sr-only">已选择</span>`:'';});
  const advance=$('#advance');if(advance&&session.config.mode==='practice')advance.disabled=!locked&&!answer;
}
function updateProgress(){
  const n=Object.keys(session.answers).length,track=$('.progress-track');track.setAttribute('aria-valuenow',n);track.setAttribute('aria-valuetext',`已答 ${n} 题，共 ${questions.length} 题`);track.firstElementChild.style.width=`${n/questions.length*100}%`;$('#progress-label').innerHTML=`<b>${String(session.index+1).padStart(2,'0')}</b> / ${String(questions.length).padStart(2,'0')}`;
  const btn=$(`[data-jump="${session.index}"]`);btn?.classList.toggle('answered',!!session.answers[questions[session.index].id]);
}
function confirmAnswer(){const q=questions[session.index];if(!session.answers[q.id])return;if(!session.confirmed.includes(q.id))session.confirmed.push(q.id);save();updateOptions();showFeedback(true);const b=$('#advance');b.dataset.action='next';b.innerHTML=`${session.index===questions.length-1?'查看结果':'下一题'}${icon('arrow')}`;b.disabled=false;}
function showFeedback(fresh){
  const q=questions[session.index],correct=session.answers[q.id]===q.answer,quick=session.config.mode==='quick';
  if(fresh&&correct&&!reduced())$('.answer.correct')?.setAttribute('data-answer-pulse','');
  let streak=0;for(let i=session.index;i>=0;i--){if(session.answers[questions[i].id]!==questions[i].answer)break;streak++;}
  const line=correct?(streak>=3?`${streak} 连对`:'答对了'):'答错了';
  const f=$('#answer-feedback');f.className=`feedback visible ${correct?'good':'oops'}`;f.innerHTML=`<div class="feedback-line">${icon(correct?'check':'bulb')}<strong>${line}</strong><button class="text-button" data-action="explain" aria-expanded="false" aria-controls="explanation-area">解析${icon('arrow')}</button></div>${quick?`<button class="quick-next" data-action="next">${session.index===questions.length-1?'查看结果':'下一题'}${icon('arrow')}</button>`:''}`;
  if(fresh)motion.enter(f,'feedback');
  if(fresh&&correct&&[3,5,10,20,50,100].includes(streak)){toast(`${streak} 连对`);if(streak===3)celebrate(12);}
  if(quick&&fresh)scheduleNext();else if(quick)$('#auto-label').textContent='手动切题';
}
function scheduleNext(){
  cancelAuto();if(view!=='quiz'||session.config.mode!=='quick')return;const q=questions[session.index];if(!session.confirmed.includes(q.id)||paused)return;
  const enabled=$('#auto-toggle')?.checked;if(!enabled){$('#auto-label').textContent='手动切题';return;}
  const token=generation;$('#auto-label').textContent='自动切题…';$('.quick-controls')?.classList.add('counting');autoTimer=setTimeout(()=>{if(token===generation&&view==='quiz'&&!modal.open&&!document.hidden)nextQuestion();},1650);
}
function explain(){
  cancelAuto();paused=true;$('#auto-label').textContent='已暂停';
  const q=questions[session.index],drawer=$('#explanation-area'),opening=!drawer.classList.contains('is-open');
  const content=drawer.firstElementChild,firstOpen=!content.firstElementChild;
  if(firstOpen)content.innerHTML=`<div class="explanation"><p>${esc(q.explanation)}</p><div class="source-links">${sourceLinks(q)}</div></div>`;
  drawer.classList.toggle('is-open',opening);content.inert=!opening;drawer.setAttribute('aria-hidden',String(!opening));
  $('[data-action="explain"]').setAttribute('aria-expanded',String(opening));
  if(opening&&firstOpen)motion.enter(drawer,'explanation');
}
function moveQuestion(index){
  if(!session||view!=='quiz')return;if(session.deadline&&session.deadline<=Date.now()){finish(true);return;}
  const stage=$('#question-stage');stage.style.minHeight=`${Math.max(stage.getBoundingClientRect().height,parseFloat(stage.style.minHeight)||0)}px`;
  questionDirection=index<session.index?-1:1;session.index=Math.max(0,Math.min(questions.length-1,index));save();renderQuestion();
  const prompt=$('#question-prompt');if(prompt.getBoundingClientRect().top<24)window.scrollTo({top:Math.max(0,prompt.getBoundingClientRect().top+window.scrollY-24),behavior:'instant'});
  // Small scroll offsets survive; only deep explanation scrolling is brought back to the new prompt.
}
function nextQuestion(){if(session.config.mode==='quick'&&!session.confirmed.includes(questions[session.index].id))return;if(session.index===questions.length-1)requestFinish();else moveQuestion(session.index+1);}
function requestFinish(){
  cancelAuto();const left=questions.length-Object.keys(session.answers).length;
  if(left){dialog('结束本局？',`<p>还有 ${left} 题未作答。</p><div class="dialog-actions"><button class="secondary-button" data-action="close">继续答题</button><button class="primary-button" data-action="finish">查看结果${icon('arrow')}</button></div>`);}else finish();
}
function clock(){if(view!=='quiz'||!session)return;if(session.deadline&&Date.now()>=session.deadline){finish(true);return;}const n=session.deadline?Math.max(0,Math.ceil((session.deadline-Date.now())/1000)):Math.floor((Date.now()-session.startedAt)/1000);const el=$('#quiz-clock');if(el)el.textContent=` · ${session.deadline?'还剩 ':''}${fmt(n)}`;}
function map(){cancelAuto();paused=true;dialog('题目导航',`<div class="map-summary">已猜 ${Object.keys(session.answers).length}/${questions.length} 题</div><div class="map-grid">${questions.map((q,i)=>`<button class="map-cell ${session.answers[q.id]?'answered':''} ${session.flags.includes(q.id)?'flagged':''} ${i===session.index?'current':''}" data-jump="${i}" aria-label="第 ${i+1} 题${session.answers[q.id]?'，已猜':''}${session.flags.includes(q.id)?'，有记号':''}" ${i===session.index?'aria-current="step"':''}>${i+1}</button>`).join('')}</div><button class="primary-button full-width" data-action="end-round">查看结果${icon('arrow')}</button>`);}
function finish(timed=false){
  if(finishPending||!session)return;finishPending=true;cancelAuto();modal.close();clearInterval(clockTimer);
  report=grade(questions,session.answers,session.startedAt,Date.now());report.challengeUrl=challengeURL(questions,SITE_URL);remove('session');results();if(timed)toast('时间到');
}
function results(){
  enter('result');const t=resultTitle(report),eggs=easterEggs(report),palette=resultPalette(report);
  const trail=questions.length<=10?`<div class="result-trail" role="list" aria-label="每题结果">${questions.map((q,i)=>{const correct=session.answers[q.id]===q.answer;return `<span class="${correct?'good':'oops'}" role="listitem" aria-label="第 ${i+1} 题，${correct?'答对':'未答对'}"><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${icon(correct?'check':'close')}</span>`;}).join('')}</div>`:'';
  main.innerHTML=resultMarkup({t,eggs,palette,trail,report,fmt});
  animate($('.result-shell'));motion.enter($('.result-shell'),'result');countUp($('.result-score strong'),report.score);if(report.correct===report.total)celebrate(64);
}
function countUp(el,value){stopScore=animateScore(el,value,{window,reducedMotion:reduced,onComplete:()=>$('.result-emblem')?.setAttribute('data-score-complete','')});}
function review(){
  enter('review');main.innerHTML=reviewMarkup({questions,session,sourceLinks});disposeMedia=mountQuestionMedia(main);
}
async function showShare(){
  const preferred=read('share-theme',document.documentElement.dataset.theme);shareTheme=preferred==='dark'?'dark':'light';
  dialog('分享结果',`<div class="share-skins" role="group" aria-label="分享图片外观">${[['light','浅色'],['dark','深色']].map(([theme,label])=>`<button class="share-skin" data-share-theme="${theme}" aria-pressed="${shareTheme===theme}"><span class="share-swatch ${theme}" aria-hidden="true"></span>${label}</button>`).join('')}</div><div id="share-preview" class="share-preview" aria-busy="true"><span class="loader"></span></div><div class="share-buttons"><button class="primary-button" data-action="download" disabled>${icon('download')}保存图片</button><button class="secondary-button" data-action="native-share" disabled>${icon('share')}分享</button></div><button class="text-button full-width" data-action="copy">${icon('copy')}复制文字</button>`);
  const actions=document.createElement('div');actions.className='challenge-share';
  actions.innerHTML=`<button class="secondary-button full-width" data-action="copy-challenge">${icon('link')}复制同题挑战链接</button><p>${report.challengeUrl.length>1200?'本局题目较多，复制链接邀请朋友挑战。':'朋友打开后，可以挑战你刚答过的这一组题。'}</p>`;
  $('#modal-content').append(actions);await renderSharePreview();
}
async function renderSharePreview(){
  const preview=$('#share-preview'),currentReport=report,title=resultTitle(report);
  if(!modal.open||!preview)return;
  clearShareSurface();preview.setAttribute('aria-busy','true');preview.innerHTML='<span class="loader"></span>';
  modal.querySelectorAll('.share-buttons button').forEach(b=>b.disabled=true);
  modal.querySelectorAll('[data-share-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shareTheme===shareTheme)));
  await sharePreview.show(currentReport,title.title,{
    theme:shareTheme,
    ready:({url})=>{
      if(!modal.open||!preview.isConnected)return;
      preview.setAttribute('aria-busy','false');
      preview.innerHTML=`<div class="share-card-frame"><img src="${url}" width="1080" height="1440" alt="Apple 冷知识战绩：${currentReport.score} 分，${esc(title.title)}，猜对 ${currentReport.correct}/${currentReport.total} 题，不服来战。"></div>`;
      disposeShareSurface=mountSurfacePointer(preview,{document,window,selector:'.share-card-frame',tilt:true});
      modal.querySelectorAll('.share-buttons button').forEach(b=>b.disabled=false);
    },
    fail:()=>{if(modal.open&&preview.isConnected){preview.setAttribute('aria-busy','false');preview.innerHTML='<div><p>图片生成失败</p><button class="text-button" data-action="share-retry">重试</button></div>';}},
  });
}
async function nativeShare(){const blob=sharePreview.blob;if(!blob)return;const button=$('[data-action="native-share"]');try{const file=new File([blob],'apple-trivia.png',{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Apple 冷知识，不服来战',text:shareText(report,resultTitle(report).title)});else if(navigator.share)await navigator.share({title:'Apple 冷知识',text:shareText(report,resultTitle(report).title),url:report.challengeUrl||SITE_URL});else{downloadBlob(blob,`apple-trivia-${report.score}.png`);toast('图片已生成');}motion.feedback(button);}catch(e){if(e.name!=='AbortError')toast('分享失败，请保存图片后重试。');}}
async function copyChallenge(){const url=report?.challengeUrl;if(!url)return;const button=$('[data-action="copy-challenge"]');try{await navigator.clipboard.writeText(url);if(!button?.isConnected)return;toast('挑战链接已复制');motion.feedback(button);}catch{dialog('同题挑战链接',`<textarea class="copy-text" readonly aria-label="同题挑战链接">${esc(url)}</textarea><p class="muted">全选复制，发送给朋友即可。</p>`);$('.copy-text').select();}}
async function copy(){const currentReport=report,button=$('[data-action="copy"]'),s=shareText(report,resultTitle(report).title);try{await navigator.clipboard.writeText(s);if(report!==currentReport||!button?.isConnected)return;toast('已复制');motion.feedback(button);}catch{if(report!==currentReport||!button?.isConnected)return;dialog('复制结果',`<textarea class="copy-text" readonly aria-label="战绩文字">${esc(s)}</textarea><p class="muted">长按或全选，即可复制。</p>`);$('.copy-text').select();}}
function celebrate(n){if(reduced())return;clearTimeout(celebrationTimer);const box=$('#celebration');box.replaceChildren();for(let i=0;i<n;i++){const p=document.createElement('i');p.style.cssText=`--x:${Math.random()*100}vw;--drift:${(Math.random()-.5)*280}px;--r:${Math.random()*900}deg;--delay:${Math.random()*.4}s;--c:${['#af9bff','#ffbd9f','#9adacb','#f0cf74','#83b9fb'][i%5]}`;box.append(p);}celebrationTimer=setTimeout(()=>box.replaceChildren(),2500);}
function about(){dialog('关于',`<p>Apple 冷知识小游戏。默认每局 5 题。</p><p>目前有 <b>${bank.length.toLocaleString('en-US')}</b> 道题，包含产品故事、反直觉小知识、系统功能、发布年份和时间线。时间线题由产品与系统的年份记录组合生成，短局会优先抽趣味题。</p><p>每题都保留解析和 Apple 资料链接。年份采用首次发布或首次预览的公历年份，具体口径写在题目中。不同地区的上市时间可能不同。</p><p class="muted">进度仅保存在当前浏览器。与 Apple Inc. 无关联。v${VERSION}</p><a class="text-button" href="https://github.com/yunnre060214-sudo/Apple-Trivia" target="_blank" rel="noopener noreferrer">查看题库与源代码${icon('external')}</a><button class="secondary-button replay-intro" data-action="replay-hello">${icon('history')}重播 hello</button>`);}

document.addEventListener('click',e=>{
  const exhibit=e.target.closest('[data-gallery-question]');
  if(exhibit){if(followsInPlace(e,exhibit)){e.preventDefault();startGalleryQuestion(exhibit.dataset.galleryQuestion);}return;}
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.shareTheme){if(b.dataset.shareTheme!==shareTheme){shareTheme=b.dataset.shareTheme;write('share-theme',shareTheme);void renderSharePreview();}return;}
  if(b.dataset.answer!==undefined){selectAnswer(Number(b.dataset.answer));return;}
  if(b.dataset.topic){start(quickConfig(b.dataset.topic));return;}
  if(b.dataset.count){config.count=Number(b.dataset.count);$('#count-input').value=b.dataset.count;document.querySelectorAll('[data-count]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});updatePool();return;}
  if(b.dataset.jump!==undefined){modal.close();moveQuestion(Number(b.dataset.jump));return;}
  const actions={home,'challenge-start':startChallenge,'copy-challenge':copyChallenge,'replay-hello':()=>{modal.close();replayHello();},quick:()=>start(quickConfig()),custom,resume,about,close:()=>motion.closeDialog(modal),theme:()=>{void switchTheme(b);},next:nextQuestion,previous:()=>moveQuestion(session.index-1),confirm:confirmAnswer,explain,map,'end-round':requestFinish,finish:()=>finish(),results,review,'share-card':showShare,'share-retry':renderSharePreview,download:()=>{if(sharePreview.blob){downloadBlob(sharePreview.blob,`apple-trivia-${report.score}.png`);motion.feedback(b);}},'native-share':nativeShare,copy,flag:()=>{const id=questions[session.index].id;session.flags=session.flags.includes(id)?session.flags.filter(x=>x!==id):[...session.flags,id];save();b.setAttribute('aria-pressed',String(session.flags.includes(id)));b.setAttribute('aria-label',session.flags.includes(id)?'取消标记':'标记题目');},reload:()=>location.reload()};actions[b.dataset.action]?.();
});
document.addEventListener('submit',e=>{if(e.target.id!=='custom-form')return;e.preventDefault();const next=formConfig();if(!Number.isInteger(next.count)||next.count<5||next.count>500||!next.categories.length)return;config=next;write('config',config);start(config);});
document.addEventListener('change',e=>{if(e.target.closest('#custom-form')){if(e.target.id==='mode-select')$('.timer-setting').hidden=e.target.value!=='exam';updatePool();}if(e.target.id==='auto-toggle'){write('auto',e.target.checked);paused=false;scheduleNext();}});
document.addEventListener('input',e=>{if(e.target.id==='count-input'){document.querySelectorAll('[data-count]').forEach(b=>{const active=Number(b.dataset.count)===Number(e.target.value);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});updatePool();}});
document.addEventListener('keydown',e=>{
  if(document.documentElement.classList.contains('hello-pending')||view!=='quiz'||modal.open)return;
  const shortcut=quizShortcut(e,document.activeElement);if(!shortcut)return;
  if(session.config.mode==='quick'&&['previous','next'].includes(shortcut.action))return;
  e.preventDefault();switchTheme.settle();
  if(shortcut.action==='answer')selectAnswer(shortcut.index);
  else if(shortcut.action==='previous')moveQuestion(session.index-1);
  else if(shortcut.action==='advance'&&session.config.mode==='practice'&&!session.confirmed.includes(questions[session.index].id))confirmAnswer();
  else nextQuestion();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAuto();else if(view==='quiz'){clock();scheduleNext();}});
modal.addEventListener('close',()=>{if(modal.open)return;clearShareSurface();sharePreview.clear();if(view==='quiz'&&session?.config.mode==='quick'&&$('#auto-label'))$('#auto-label').textContent='手动切题';});
window.addEventListener('pagehide',()=>{disposeMedia();stopScore();save();cancelAuto();clearShareSurface();sharePreview.clear();clearTimeout(celebrationTimer);});
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function syncBrowserTheme(theme){setBrowserTheme(document,theme);}
function applyTheme(theme,{syncChrome=true}={}){
  const dark=theme==='dark';
  document.documentElement.dataset.theme=dark?'dark':'light';
  if(syncChrome&&!document.documentElement.classList.contains('theme-revealing'))syncBrowserTheme(theme);
  previewTheme(theme);
}
function previewTheme(theme){
  const dark=theme==='dark';
  const toggle=$('#theme-toggle'),symbol=dark?'sun':'moon';
  if(toggle.querySelector('[data-icon]')?.dataset.icon!==symbol){toggle.innerHTML=icon(symbol);motion.activate(toggle);}
  toggle.setAttribute('aria-label',dark?'使用浅色外观':'使用深色外观');
}
const switchTheme=createThemeSwitcher({document,window,applyTheme:theme=>applyTheme(theme,{syncChrome:false}),previewTheme,commitTheme:syncBrowserTheme,saveTheme:theme=>write('theme',theme),reducedMotion:reduced,duration:new URLSearchParams(location.search).get('motion')==='slow'?6000:780});
function preferredTheme(){const saved=read('theme',null);return ['dark','light'].includes(saved)?saved:systemTheme.matches?'dark':'light';}
applyTheme(preferredTheme());
function syncPreferredTheme(){switchTheme.settle(preferredTheme());}
systemTheme.addEventListener('change',syncPreferredTheme);
window.addEventListener('storage',event=>{if(event.key===KEY+'theme'||event.key===null)syncPreferredTheme();});
async function init(){try{const res=await fetch(`./questions.json?v=${VERSION}`);if(!res.ok)throw new Error('load');const data=await res.json();if(data.version!==VERSION||!Array.isArray(data.questions)||!data.questions.length)throw new Error('version');bank=data.questions;route();}catch{main.innerHTML=`<div class="loading"><h1>加载失败</h1><p>请检查网络后重试。</p><button class="primary-button" data-action="reload">重试${icon('arrow')}</button></div>`;}}
window.addEventListener('hashchange',event=>{if(!bank.length)return;const before=new URL(event.oldURL).hash,after=new URL(event.newURL).hash;if(after==='#main')return;if(before.startsWith('#challenge=')||after.startsWith('#challenge=')){route();return;}const change=questionRouteChange(event.oldURL,event.newURL);if(change)route();});
init();


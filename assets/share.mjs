import {APPLE_PATH} from './brand.mjs?v=__VERSION__';
import {qrMatrix} from './qr.mjs';
export const SITE_URL = 'https://yunnre060214-sudo.github.io/Apple-Trivia/';
const PALETTES = {
  perfect:{title:['#88632d','#997645'],darkTitle:['#dec392','#e3cfaa'],wash:['#f3eddf','#f7f2e7'],ink:'#88632d'},
  regular:{title:['#39664c','#55785e'],darkTitle:['#aac7af','#bbd1bb'],wash:['#ebefe6','#f3f5ef'],ink:'#39664c'},
  curious:{title:['#a04f3a','#ad6a53'],darkTitle:['#e8b5a1','#edc6b4'],wash:['#f5eae1','#f8f0e8'],ink:'#a04f3a'},
};
export function resultPalette(report) {
  return PALETTES[report.total>0&&report.correct===report.total?'perfect':report.score>=60?'regular':'curious'];
}
export function shareText(report,title) {
  return `Apple 冷知识 · ${report.correct}/${report.total} 题 · ${report.score} 分\n「${title}」\n不服来战！\n${report.challengeUrl||SITE_URL}`;
}

// One renderer per report/title/skin, one owner per visible preview. Closing or replacing
// a dialog invalidates its callbacks and releases its object URL immediately.
export function createSharePreview({render=createShareCard,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}) {
  const cache=new WeakMap();
  let revision=0,url=null,blob=null;
  function clear() {
    revision++;
    if(url)revokeUrl(url);
    url=null;blob=null;
  }
  async function show(report,title,{theme='light',ready,fail}) {
    clear();const token=revision;
    theme=theme==='dark'?'dark':'light';
    let variants=cache.get(report);
    if(!variants){variants=new Map();cache.set(report,variants);}
    const key=JSON.stringify([title,theme]);
    let task=variants.get(key);
    if(!task){task=Promise.resolve().then(()=>render(report,title,{theme}));variants.set(key,task);}
    try {
      const generated=await task;
      if(token!==revision)return;
      url=createUrl(generated);blob=generated;ready({blob,url});
    } catch(error) {
      if(variants.get(key)===task)variants.delete(key);
      if(token===revision)fail(error);
    }
  }
  return {show,clear,get blob(){return blob;}};
}
// Resolve the requested skin through the same palette selectors as the page.
// Capture before awaiting fonts so a later theme change cannot recolor this job.
function shareColors(theme) {
  const probe=document.createElement('span');probe.className='theme-palette';probe.dataset.theme=theme;probe.hidden=true;
  document.body.append(probe);
  try {
    const style=document.defaultView.getComputedStyle(probe);
    return Object.fromEntries(['bg','surface','ink','muted','line','green','red','material-line','material-highlight'].map(key=>[key,style.getPropertyValue(`--${key}`).trim()]));
  } finally {probe.remove();}
}

export function shareTrailLayout(total) {
  const columns=total<=10?Math.max(1,total):total<=50?10:total<=200?25:40;
  const rows=Math.ceil(total/columns),stepX=Math.min(76,840/columns),stepY=Math.min(34,176/Math.max(1,rows));
  return {columns,rows,stepX,stepY,radius:Math.min(total<=10?15:10,(stepX-8)/2,(stepY-4)/2)};
}

export async function createShareCard(report,title,{theme=document.documentElement.dataset.theme}={}) {
  theme=theme==='dark'?'dark':'light';
  const colors=shareColors(theme),palette=resultPalette(report),accent=theme==='dark'?palette.darkTitle[0]:palette.title[0];
  await document.fonts?.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas unavailable');
  const {ink,muted,line}=colors;
  const spectrum=['#68a65b','#d7b945','#d88b49','#ce6263','#9a6b9d','#5f91bd'];
  const font=(size,weight=400)=>{c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;};
  const text=(value,x,y,size,weight=400,color=ink,align='left',max=880)=>{
    value=String(value);font(size,weight);
    while(c.measureText(value).width>max&&size>16)font(--size,weight);
    c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);
  };
  const rule=y=>{c.strokeStyle=line;c.lineWidth=1.5;c.beginPath();c.moveTo(100,y);c.lineTo(980,y);c.stroke();};
  const stripe=(x,y,width,height)=>{spectrum.forEach((color,i)=>{c.fillStyle=color;c.fillRect(x+i*width/6,y,width/6,height);});};
  const circle=(x,y,r,color,stroke=false)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(stroke){c.strokeStyle=color;c.lineWidth=1.5;c.stroke();}else{c.fillStyle=color;c.fill();}};
  c.fillStyle=colors.bg;c.fillRect(0,0,1080,1440);
  const glow=c.createRadialGradient(990,240,0,990,240,850);glow.addColorStop(0,accent);glow.addColorStop(1,'transparent');
  c.save();c.globalAlpha=theme==='dark'?.14:.09;c.fillStyle=glow;c.fillRect(0,0,1080,1440);c.restore();
  c.save();c.translate(86,111);c.scale(2.2,2.2);c.translate(0,-9);
  const logoGradient=c.createLinearGradient(0,10,0,31);
  spectrum.forEach((color,i)=>{logoGradient.addColorStop(i/6,color);logoGradient.addColorStop((i+1)/6,color);});
  c.fillStyle=logoGradient;c.fill(new Path2D(APPLE_PATH));c.restore();
  text('Apple Trivia',145,155,34,600);
  c.beginPath();c.roundRect(56,232,968,994,32);c.fillStyle=colors.surface;c.fill();
  c.strokeStyle=colors['material-line']||line;c.lineWidth=1.5;c.stroke();
  c.beginPath();c.moveTo(89,233);c.lineTo(991,233);c.strokeStyle=colors['material-highlight']||line;c.stroke();
  text('本局成绩',100,317,28,400,muted);
  // A trophy for a perfect round; the familiar leaf silhouette for other titles.
  c.save();c.globalAlpha=.1;circle(942,308,35,accent);c.restore();
  c.save();c.translate(942,308);c.strokeStyle=accent;c.fillStyle=accent;c.lineWidth=2.5;c.lineCap='round';c.lineJoin='round';
  if(report.total>0&&report.correct===report.total){
    c.beginPath();c.moveTo(-12,-14);c.lineTo(12,-14);c.lineTo(12,-3);c.bezierCurveTo(12,13,-12,13,-12,-3);c.closePath();c.stroke();
    c.beginPath();c.moveTo(-12,-10);c.bezierCurveTo(-27,-14,-25,4,-11,3);c.moveTo(12,-10);c.bezierCurveTo(27,-14,25,4,11,3);c.moveTo(0,9);c.lineTo(0,19);c.moveTo(-9,19);c.lineTo(9,19);c.stroke();
  }else{c.scale(1.7,1.7);c.translate(-10,-20);c.fill(new Path2D(APPLE_PATH));}
  c.restore();
  text(title,100,433,70,600,accent,'left',880);
  stripe(102,467,96,5);
  text(report.score,90,680,238,500,ink,'left',760);
  text('分',976,680,32,400,muted,'right');
  rule(733);
  text('答对',100,798,28,400,muted);
  text(`${report.correct} / ${report.total}`,980,798,40,500,ink,'right');
  const duration=`${Math.floor(report.duration/60)}:${String(report.duration%60).padStart(2,'0')}`;
  text('用时',100,861,28,400,muted);
  text(duration,980,861,40,500,ink,'right');
  rule(900);
  text('逐题结果',100,952,24,400,muted);
  const states=(report.rows||[]).map(row=>row.state),layout=shareTrailLayout(states.length);
  if(states.length){
    const top=1054-(layout.rows-1)*layout.stepY/2;
    states.forEach((state,i)=>{
      const count=Math.min(layout.columns,states.length-Math.floor(i/layout.columns)*layout.columns);
      const x=540+(i%layout.columns-(count-1)/2)*layout.stepX,y=top+Math.floor(i/layout.columns)*layout.stepY;
      circle(x,y,layout.radius,state==='correct'?colors.green:state==='wrong'?colors.red:muted,state==='unanswered');
      if(states.length<=10){
        c.strokeStyle=colors.surface;c.lineWidth=2;c.beginPath();
        if(state==='correct'){c.moveTo(x-6,y);c.lineTo(x-1,y+4);c.lineTo(x+6,y-5);c.stroke();}
        else if(state==='wrong'){c.moveTo(x-4,y-4);c.lineTo(x+4,y+4);c.moveTo(x+4,y-4);c.lineTo(x-4,y+4);c.stroke();}
        text(String(i+1).padStart(2,'0'),x,y+39,19,400,muted,'center');
      }
    });
  }
  [['答对',colors.green],['答错',colors.red],['未答',muted]].forEach(([label,color],i)=>{const x=397+i*143;circle(x,1180,4,color,i===2);text(label,x+13,1187,19,400,muted);});
  const qr=report.challengeUrl?qrMatrix(report.challengeUrl):null;
  text(qr?'扫码挑战同一组题':'不服来战',88,1323,qr?36:42,600);
  text('yunnre060214-sudo.github.io/Apple-Trivia/',88,1380,23,400,muted,'left',qr?690:880);
  if(qr){
    const step=Math.max(2,Math.floor(198/(qr.length+8))),size=(qr.length+8)*step,x=1000-size,y=1410-size;
    c.fillStyle='#fff';c.fillRect(x,y,size,size);c.fillStyle='#101820';
    qr.forEach((row,r)=>row.forEach((dark,col)=>{if(dark)c.fillRect(x+(col+4)*step,y+(r+4)*step,step,step);}));
  }else stripe(932,1310,60,4);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
}
export function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}

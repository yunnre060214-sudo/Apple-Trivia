import {APPLE_PATH} from './brand.mjs?v=3.4.1';
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
  return `Apple 冷知识 · ${report.correct}/${report.total} 题 · ${report.score} 分\n「${title}」\n不服来战！\n${SITE_URL}`;
}

// One renderer per report, one owner per visible preview. Closing or replacing
// a dialog invalidates its callbacks and releases its object URL immediately.
export function createSharePreview({render=createShareCard,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}) {
  const cache=new WeakMap();
  let revision=0,url=null,blob=null;
  function clear() {
    revision++;
    if(url)revokeUrl(url);
    url=null;blob=null;
  }
  async function show(report,title,{ready,fail}) {
    clear();const token=revision;
    let task=cache.get(report);
    if(!task){task=Promise.resolve().then(()=>render(report,title));cache.set(report,task);}
    try {
      const generated=await task;
      if(token!==revision)return;
      url=createUrl(generated);blob=generated;ready({blob,url});
    } catch(error) {
      if(cache.get(report)===task)cache.delete(report);
      if(token===revision)fail(error);
    }
  }
  return {show,clear,get blob(){return blob;}};
}
export async function createShareCard(report,title) {
  await document.fonts?.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas unavailable');
  const ink='#222622',muted='#656b65',line='#d9dcd3';
  const spectrum=['#68a65b','#d7b945','#d88b49','#ce6263','#9a6b9d','#5f91bd'];
  const font=(size,weight=400)=>{c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;};
  const text=(value,x,y,size,weight=400,color=ink,align='left',max=880)=>{
    value=String(value);font(size,weight);
    while(c.measureText(value).width>max&&size>16)font(--size,weight);
    c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);
  };
  const rule=y=>{c.strokeStyle=line;c.lineWidth=2;c.beginPath();c.moveTo(88,y);c.lineTo(992,y);c.stroke();};
  const stripe=(x,y,width,height)=>{spectrum.forEach((color,i)=>{c.fillStyle=color;c.fillRect(x+i*width/6,y,width/6,height);});};
  c.fillStyle='#f5f4f0';c.fillRect(0,0,1080,1440);
  c.save();c.translate(86,111);c.scale(2.2,2.2);c.translate(0,-9);
  const logoGradient=c.createLinearGradient(0,10,0,31);
  spectrum.forEach((color,i)=>{logoGradient.addColorStop(i/6,color);logoGradient.addColorStop((i+1)/6,color);});
  c.fillStyle=logoGradient;c.fill(new Path2D(APPLE_PATH));c.restore();
  text('Apple Trivia',145,155,34,600);
  rule(210);
  text('本局成绩',88,286,28,400,muted);
  text(title,88,414,76,600,ink,'left',900);
  stripe(92,450,108,6);
  text(report.score,80,781,286,500,ink,'left',780);
  text('分',966,781,34,400,muted,'right');
  rule(858);
  text('答对',88,935,28,400,muted);
  text(`${report.correct} / ${report.total}`,992,935,42,500,ink,'right');
  const duration=`${Math.floor(report.duration/60)}:${String(report.duration%60).padStart(2,'0')}`;
  text('用时',88,1018,28,400,muted);
  text(duration,992,1018,42,500,ink,'right');
  rule(1074);
  text('不服来战',88,1180,42,600);
  text('yunnre060214-sudo.github.io',88,1292,24,400,muted);
  text('/Apple-Trivia/',88,1332,24,400,muted);
  stripe(88,1370,66,3);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
}
export function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}

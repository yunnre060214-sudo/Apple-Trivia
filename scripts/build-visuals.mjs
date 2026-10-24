import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {devices} from '../assets/gallery-data.mjs';
import {visualArtwork} from '../src/visual.mjs';
const pins=(n,x,y,step=12)=>Array.from({length:n},(_,i)=>`<rect x="${x+i*step}" y="${y}" width="5" height="20" rx="2" fill="#c7a569"/>`).join('');
const portArt={
 'usb-a':'<rect x="172" y="106" width="296" height="108" rx="9" fill="#202c3b" stroke="#929eaa" stroke-width="12"/><rect x="191" y="153" width="258" height="43" rx="2" fill="#8893a2"/>'+pins(4,238,154,52),
 'usb-c':'<rect x="174" y="110" width="292" height="100" rx="50" fill="#202c3b" stroke="#929eaa" stroke-width="12"/><rect x="209" y="151" width="222" height="19" rx="9" fill="#a9b4bd"/>'+pins(12,225,151,16),
 'hdmi':'<path d="M174 108H466V172L433 211H207L174 172Z" fill="#202c3b" stroke="#929eaa" stroke-width="12"/><path d="M203 136H437L423 163H217Z" fill="#a9b4bd"/>'+pins(19,210,137,12),
 'mini-dp':'<path d="M229 100H411V186L390 210H250L229 186Z" fill="#202c3b" stroke="#929eaa" stroke-width="10"/><rect x="252" y="126" width="136" height="39" rx="3" fill="#a9b4bd"/>'+pins(10,260,127,12)+'<g stroke="#688cad" stroke-width="3" fill="none"><rect x="302" y="243" width="36" height="24" rx="2"/><path d="M320 267v8m-12 0h24"/></g>',
 'firewire':'<path d="M223 104H383L423 141V180L383 216H223Z" fill="#202c3b" stroke="#929eaa" stroke-width="10"/>'+pins(3,260,127,47)+pins(3,260,171,47),
 'magsafe':'<rect x="161" y="122" width="318" height="77" rx="12" fill="#303d4c" stroke="#a0aab4" stroke-width="12"/>'+Array.from({length:5},(_,i)=>`<circle cx="${218+i*51}" cy="160" r="12" fill="#c7a569" stroke="#ead5ac" stroke-width="2"/>`).join(''),
 'audio':'<circle cx="320" cy="160" r="67" fill="#202c3b" stroke="#98a5b4" stroke-width="15"/><circle cx="320" cy="160" r="47" stroke="#405365" stroke-width="6" fill="#101c2a"/>',
 'ethernet':'<path d="M215 111H276V93H364V111H425V225H215Z" fill="#202c3b" stroke="#929eaa" stroke-width="10"/>'+pins(8,241,123,22)+'<path d="M269 190H371V215H269Z" fill="#3f5062"/>',
};
export async function buildVisuals(root){
 const output=resolve(root,'assets/visual');await mkdir(output,{recursive:true});
 for(const {asset,art} of visualArtwork){
  let body;
  if(art.type==='port')body=portArt[art.port];
  else{
   const device=devices.find(d=>d.id===art.device),raw=await readFile(resolve(root,'assets',device.image),'utf8');
   const inner=raw.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title[\s\S]*?<\/title>/,'');
   let highlight='';
   if(art.focus&&!Array.isArray(art.focus)){const {x,y,width,height}=art.focus;highlight=`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="#5d88c517" stroke="#477caf" stroke-width="3" stroke-dasharray="5 4"/>`;}
   else if(art.focus){const [x,y,r,rotate=0]=art.focus;highlight=`<g transform="rotate(${rotate} 240 222)"><circle cx="${x}" cy="${y}" r="${r}" fill="#5d88c517" stroke="#477caf" stroke-width="3" stroke-dasharray="5 4"/><circle cx="${x+r*.77}" cy="${y-r*.77}" r="6" fill="#477caf" stroke="#fff" stroke-width="2"/></g>`;}
   body=`<g transform="translate(145 4) scale(.73)">${inner}${highlight}</g>`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" fill="none"><defs><radialGradient id="study-bg"><stop stop-color="#e7edf1"/><stop offset="1" stop-color="#f4f5f2"/></radialGradient></defs><rect width="640" height="320" rx="12" fill="url(#study-bg)"/><path d="M38 269H602M38 53H602" stroke="#dce2e3"/>${body}</svg>`;
  await writeFile(resolve(output,asset),svg);
 }
}
if(process.argv[1]&&new URL(import.meta.url).pathname===resolve(process.argv[1]))await buildVisuals(resolve(new URL('..',import.meta.url).pathname));

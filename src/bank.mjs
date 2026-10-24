import { hash, seeded, shuffle, validateBank } from './engine.mjs';
import { galleryQuestions } from '../assets/gallery-data.mjs';
import { buildTrivia } from './trivia.mjs';
import { buildTimeline } from './timeline.mjs';
import {curatedV4} from './curated-v4.mjs';
import {visualQuestions} from './visual.mjs';
import {withFactKeys} from './facts.mjs';
import { editorialQuestions, extraProducts, silicon } from './editorial.mjs';

export const REVIEWED_AT = '2026-10-24';
const unique = items => [...new Set(items)];
const number = value => Number.isInteger(Number(value)) ? String(Number(value)) : String(value);
export const pretty = (key,value) => ({
  year: `${value} 年`, screen: `${number(value)} 英寸`, resolution: `${value} 像素`,
  ppi: `${value} ppi`, storage: Number(value)>=1024?`${Number(value)/1024} TB`:`${value} GB`,
  camera: `${number(Number(value)*100)} 万像素`, videoHours: `${value} 小时`,
  depth: `${value} 米`, refresh: `${value} Hz`, gpu: `${value} 核`,
  bandwidth: `${value} GB/s`, bluetooth: `蓝牙 ${value}`, wifi: `Wi-Fi ${value}`,
  cpu: `${value} 核`, neural: `${value} 核`, memory: `${value} GB`, transistors: `${number(Number(value)*10)} 亿`,
  process: `${value} 纳米`, brightness: `${value} 尼特`, battery: `${value} 小时`,
  caseSize: `${value} 毫米`, water: `${value} 米`,
})[key] || String(value);

const specs = {
  year: ['medium','推出年份','最初于哪一年推出？','指该型号的首次推出年份，不随之后的软件更新或容量调整而改变。'],
  screen: ['medium','屏幕对角线','官方标示的屏幕对角线尺寸约为多少？','按技术规格的尺寸口径作答；圆角屏幕的实际可视区域会更小。'],
  resolution: ['hard','屏幕分辨率','内置屏幕的原生像素分辨率是多少？','这是物理像素数量，与系统缩放后的逻辑工作区大小不同。'],
  ppi: ['hard','像素密度','内置屏幕的像素密度是多少？','ppi 表示每英寸的像素数；它与屏幕尺寸、像素分辨率共同描述显示精细度。'],
  display: ['medium','显示技术','下列哪项最准确地描述其内置屏幕技术？','Mini-LED 指 LCD 的背光技术；OLED 像素自行发光，串联 OLED 则使用叠层结构。'],
  chip: ['medium','主芯片','使用哪一款 Apple 主芯片？','题目针对指定型号，不能仅由同一年或相似外观推断芯片。'],
  chipOptions: ['medium','可选主芯片组合','在该代产品的官方配置中，可选主芯片组合是哪一组？','这里列举这一代产品的可选系列，不代表每款配置同时拥有这些芯片。'],
  bluetooth: ['hard','蓝牙版本','技术规格中列出的蓝牙版本是哪一项？','蓝牙版本与 Wi-Fi 标准分别描述不同的无线连接能力。'],
  wifi: ['hard','Wi-Fi 标准','技术规格中列出的 Wi-Fi 代际标准是哪一项？','Wi-Fi 6E 在 Wi-Fi 6 的基础上扩展至 6 GHz 频段，实际可用频段受地区规则影响。'],
  biometric: ['easy','生物识别','内置的生物识别方式是哪一项？','Face ID 使用原深感摄像头进行面容认证，Touch ID 使用指纹；设备密码属于另一种验证方式。'],
  storage: ['hard','存储容量上限','官方技术规格列出的最高内置存储容量是多少？','指设备内置存储的容量选项，不含 iCloud、外接硬盘或可用容量扣减。'],
  camera: ['medium','后置主摄像头像素','后置主摄像头的标称像素数是多少？','指后置主摄像头的标称分辨率，拍摄模式、合并像素和照片输出尺寸可能另有设置。'],
  videoHours: ['hard','视频播放续航','按 Apple 官方测试条件，标示的视频播放时间最长可达多少？','这里采用该型号美国官网规格的本地视频播放测试值，不是流媒体时长，也不代表所有实际使用场景。'],
  ip: ['hard','防尘抗水等级','官方标示的防尘抗水等级是哪一项？','等级对应受控实验室条件。抗水能力会随正常使用下降，不能据此推断可以无限期浸泡。'],
  depth: ['hard','抗水测试深度','在官方列出的最长 30 分钟抗水测试条件中，最大水深是多少？','这是受控实验室测试条件，不是建议使用水深；抗水性能并非永久有效。'],
  connector: ['easy','机身有线接口','机身上的主要有线充电／数据接口是哪一种？','问的是设备机身接口；连接线另一端的插头、盒内电源适配器和无线充电能力另行区分。'],
  refresh: ['easy','ProMotion 刷新率','其 ProMotion 显示屏支持的最高刷新率是多少？','最高刷新率不代表始终以此频率运行，自适应刷新率会根据显示内容调节。'],
  pencil: ['hard','压感手写笔兼容','以下哪款支持压感的 Apple Pencil 与此型号兼容？','Apple Pencil 的压感型号有各自的兼容范围；Apple Pencil (USB-C) 提供倾斜感应，不提供压感。'],
  gpu: ['hard','GPU 核心数','该型号主芯片的 GPU 配置是多少核心？','GPU 核心数是该设备的具体配置；即使使用同名芯片，不同设备的启用核心数也可能不同。'],
  bandwidth: ['hard','统一内存带宽','该型号公布的统一内存带宽是多少？','带宽描述每秒可传输的数据量，不等同于内存容量或存储盘读写速度。'],
  cpu: ['hard','CPU 核心数','完整规格的 CPU 最多提供多少核心？','按芯片公布的最高 CPU 核心配置作答，具体设备可能提供较低核心数版本。'],
  neural: ['hard','神经网络引擎','内置神经网络引擎有多少核心？','神经网络引擎专用于机器学习任务，其核心数不能与 CPU 或 GPU 核心数直接相加比较性能。'],
  memory: ['hard','统一内存上限','公布的最高统一内存容量是多少？','按该芯片可支持的容量上限作答，实际产品仍需核对对应配置。'],
  transistors: ['hard','晶体管数量','公布的晶体管数量约为多少？','此处采用 Apple 发布时公布的数量；晶体管数量本身不能直接代表所有任务的性能。'],
  process: ['medium','制程节点','采用哪一标称制程节点？','这是芯片制造工艺的节点名称，不是对每一个晶体管实际尺寸的直接测量。'],
  brightness: ['hard','峰值亮度','官方标示的显示屏峰值亮度最高可达多少？','峰值亮度与持续全屏亮度、最低亮度分别是不同指标，使用条件以该型号规格为准。'],
  battery: ['medium','常规使用续航','按官方常规使用测试，电池续航最长可达多少？','按所指型号的常规使用口径作答，低电量模式和实际使用条件可能给出不同结果。'],
  caseSize: ['medium','表壳尺寸','官方提供的表壳尺寸（或尺寸组合）是哪一项？','这里指表壳尺寸，不是显示屏对角线尺寸或表带长度。'],
  water: ['hard','防水等级','官方标示的防水等级是多少米？','防水等级与可进行的潜水深度不同，适用活动须以该型号官方说明为准。'],
};
const fallback = {
  resolution:['1920 × 1080','2048 × 1536','2388 × 1668','2532 × 1170','2752 × 2064','3024 × 1964','3456 × 2234','4480 × 2520'],
  connector:['USB-C','Lightning','30 针 Dock','Micro-USB'],
  biometric:['Face ID','Touch ID','无内置生物识别','虹膜识别'],
  display:['LCD','OLED','Mini-LED 背光 LCD','双层串联 OLED','电子墨水屏','MicroLED'],
  pencil:['Apple Pencil（第 1 代）','Apple Pencil（第 2 代）','Apple Pencil Pro','没有兼容的压感 Apple Pencil'],
  refresh:[60,90,120,144], gpu:[4,5,6,7,8,9,10,16,24,32,40,64],
  wifi:['5','6','6E','7'], bluetooth:['4.0','4.2','5.0','5.2','5.3','6'],
  process:[3,5,7,10], ip:['IP54','IP65','IP67','IP68'], depth:[1,2,4,6],
  storage:[64,128,256,512,1024,2048], bandwidth:[68.25,100,120,150,153,200,273,400,546,800],
  ppi:[132,163,218,224,227,254,264,326,401,458,460,476],
  cpu:[4,6,8,10,12,14,16,20,24,28,32], neural:[8,16,24,32],
  memory:[16,24,32,36,48,64,96,128,192,512], transistors:[16,20,25,28,33.7,37,40,57,67,92,114,134,184],
  brightness:[1000,1600,2000,3000], battery:[18,24,36,42,72],
  caseSize:['38 / 42','40 / 44','41 / 45','42 / 46','49'], water:[30,50,100,200],
};
function question(id,category,difficulty,prompt,answer,alternatives,explanation,sources,tag) {
  const rng=seeded(hash(id));
  const wrong=shuffle(unique(alternatives.filter(x=>x!==answer)),rng).slice(0,3);
  if(wrong.length!==3)throw new Error(`Not enough distractors: ${id}`);
  return {id,category,difficulty,prompt,options:shuffle([answer,...wrong],rng),answer,explanation,sources:unique(sources),tag};
}
function factQuestion(product,key,products) {
  let value=product.facts[key];const spec=specs[key];if(!spec)return null;
  if(key==='year' && String(product.model).includes(String(value)))return null;
  if(key==='chip' && product.model.includes(String(value)))return null;
  if(key==='chipOptions' && product.model.includes(String(value)))return null;
  if(key==='screen' && product.category==='ipad' && /\d+(?:\.\d+)?-inch/.test(product.model))return null;
  if(key==='ip' && product.facts.depth)return null;
  if(key==='pencil') {
    value=value.includes('Pro')?'Apple Pencil Pro':value.includes('第 2 代')?'Apple Pencil（第 2 代）':value.includes('第 1 代')?'Apple Pencil（第 1 代）':null;
    if(!value)return null;
  }
  const answer=pretty(key,value);
  let pool=[...(fallback[key]||[]).map(v=>pretty(key,v)),...products.filter(p=>p.category===product.category&&p.facts[key]!==undefined).map(p=>pretty(key,p.facts[key]))];
  if(key==='chip'&&product.category==='audio')pool.push('H1','H2','W1','S5','A8');
  if(key==='year')pool=Array.from({length:7},(_,i)=>`${Number(value)-3+i} 年`);
  if(key==='screen')pool=[...pool,...[3.5,4,4.7,5.4,5.5,5.8,6.1,6.3,6.5,6.7,6.9,7.9,8.3,9.7,10.2,10.9,11,12.9,13,13.3,13.6,14.2,15.3,16.2,24].map(v=>pretty(key,v))];
  if(key==='videoHours')pool=[Number(value)-4,Number(value)-2,Number(value)+2,Number(value)+4].map(v=>pretty(key,v));
  if(key==='camera')pool=[2,5,8,12,24,48].map(v=>pretty(key,v));
  if(key==='display') {
    if(value==='OLED'||value==='LCD')pool=['OLED','LCD','电子墨水屏','MicroLED'];
    else pool=[value,'普通 LED 背光 LCD','电子墨水屏','MicroLED'];
  }
  if(key==='chip')pool=pool.filter(v=>v!==answer&&!(v==='A16'&&answer==='A16 Bionic')&&!(v==='A16 Bionic'&&answer==='A16'));
  if(key==='pencil')pool=fallback.pencil;
  let explanation=`${product.model} 的${spec[1]}为${answer}。${spec[3]}`;
  if(key==='year')explanation=`${product.model} 于 ${value} 年首次推出。${spec[3]}`;
  if(key==='pencil')explanation=`${product.model} 可搭配 ${answer} 使用。${spec[3]}`;
  if(key==='caseSize')explanation=`${product.model} 的表壳尺寸为 ${answer}。${spec[3]}`;
  const sources=[product.source];if(key==='pencil')sources.push('https://support.apple.com/en-us/108937');
  if(product.category==='silicon'&&key==='memory') {
    const memorySpecs={M1:'111883',M4:'121552',M5:'125405'};
    if(memorySpecs[product.model])sources.push(`https://support.apple.com/en-us/${memorySpecs[product.model]}`);
  }
  let prompt=`${product.model} ${spec[2]}`;
  if(product.category==='silicon') {
    if(key==='gpu')prompt=`${product.model} 的最高 GPU 配置有多少核心？`;
    else if(['bandwidth','memory'].includes(key))prompt=`以最高核心配置为准，${product.model} 的${spec[1]}是多少？`;
  }
  return question(`spec-${product.id}-${key}`,product.category,spec[0],prompt,answer,pool,explanation,sources,spec[1]);
}
function constraintQuestions(products) {
  const result=[];
  const stems=new Set();
  const pairs=[['chip','biometric'],['chip','display'],['year','connector'],['screen','chip'],['pencil','chip'],['chip','storage'],['display','connector'],['chip','wifi']];
  for(const p of products) {
    let created=0;
    for(const [left,right] of shuffle(pairs,seeded(p.id))) {
      if(p.facts[left]===undefined||p.facts[right]===undefined||created>=2)continue;
      if(left==='pencil')continue;
      const peers=products.filter(o=>o.category===p.category&&o.id!==p.id&&o.facts[left]!==undefined&&o.facts[right]!==undefined);
      // Distractors must match one condition and fail the other: each condition matters.
      const a=peers.filter(o=>o.facts[left]===p.facts[left]&&o.facts[right]!==p.facts[right]);
      const b=peers.filter(o=>o.facts[right]===p.facts[right]&&o.facts[left]!==p.facts[left]);
      if(!a.length||!b.length)continue;
      const rng=seeded(`${p.id}-${left}-${right}`);
      const distractors=unique([...shuffle(a,rng).slice(0,2),...shuffle(b,rng).slice(0,2)]);
      if(distractors.length<3)continue;
      const chosen=distractors.slice(0,3);
      const desc=(key,value)=>key==='year'?`${value} 年推出`:key==='chip'?`搭载 ${value}`:key==='screen'?`标称屏幕尺寸为 ${pretty(key,value)}`:key==='storage'?`内置存储上限为 ${pretty(key,value)}`:key==='display'?`使用${value==='LCD'?'常规 LED 背光 LCD（不含 Mini-LED）':pretty(key,value)}显示屏`:key==='connector'?`机身主要接口为 ${value}`:key==='wifi'?`列出的无线标准为 ${pretty(key,value)}`:`生物识别方式为 ${value}`;
      const prompt=`在下列四款设备中，哪一款同时满足「${desc(left,p.facts[left])}」与「${desc(right,p.facts[right])}」？`;
      if(stems.has(prompt))continue;
      stems.add(prompt);
      const explain=[`${p.model} 同时满足两个条件。`,...chosen.map(o=>`${o.model}：${desc(left,o.facts[left])}，${desc(right,o.facts[right])}。`)].join(' ');
      result.push(question(`compare-${p.id}-${left}-${right}`,p.category,'expert',prompt,p.model,chosen.map(o=>o.model),explain,[p.source,...chosen.map(o=>o.source)],'双条件选型'));
      created++;
    }
  }
  return result;
}
function chipQuestions() {
  const products=silicon.map(row=>({id:row.id,model:row.model,category:'silicon',source:row.source,facts:row.facts}));
  const result=products.flatMap(p=>Object.keys(p.facts).map(k=>factQuestion(p,k,products))).filter(Boolean);
  for(const p of products) {
    for(const key of ['bandwidth','memory','gpu','transistors']) {
      if(p.facts[key]===undefined)continue;
      const other=products.find(o=>o.id!==p.id&&o.facts[key]&&o.facts[key]<p.facts[key]&&p.facts[key]/o.facts[key]<=4&&Number.isInteger(p.facts[key]/o.facts[key]));
      if(!other)continue;
      const ratio=p.facts[key]/other.facts[key];
      result.push(question(`ratio-${p.id}-${other.id}-${key}`,'silicon','expert',`仅比较 Apple 公布的${specs[key][1]}，${p.model} 的 ${pretty(key,p.facts[key])} 是 ${other.model} 的 ${pretty(key,other.facts[key])} 的多少倍？`,`${ratio} 倍`,[.5,1,1.5,2,2.5,3,4,6,8].map(n=>`${n} 倍`),`${p.facts[key]} ÷ ${other.facts[key]} = ${ratio}。这里只比较${specs[key][1]}，不能把这个倍数直接当作整机性能提升。`,[p.source,other.source],'规格比值'));
      break;
    }
  }
  return result;
}
export function buildBank(catalog) {
  const products=[...catalog,...extraProducts];
  const facts=products.flatMap(p=>Object.keys(p.facts).map(k=>factQuestion(p,k,products))).filter(Boolean);
  const editorial=editorialQuestions.map((q,i)=>question(q.id||`original-${String(i+1).padStart(3,'0')}`,q.category,q.difficulty,q.prompt,q.answer,q.wrong,q.explanation,q.sources,q.tag||'原创情境'));
  const bank=[...facts,...chipQuestions(),...constraintQuestions(catalog),...editorial,...galleryQuestions,...buildTrivia(),...buildTimeline(catalog),...curatedV4,...visualQuestions].map(withFactKeys);
  validateBank(bank);return bank;
}

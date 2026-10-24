import {devices} from '../assets/gallery-data.mjs';
import {seeded,shuffle} from './engine.mjs';
const portsSource='https://support.apple.com/en-us/109523';
const specs={
 mac:['Macintosh 128K','米白色一体机，方形屏幕下方有窄软盘槽，前面放着有线键盘。'],
 imac:['iMac G3','邦迪蓝半透明的圆润 CRT 一体机，顶部有提手。'],
 ipod:['第四代 iPod','白色长方形音乐播放器，上方是小屏幕，下方是圆形 Click Wheel。'],
 iphone:['初代 iPhone','银色边框的黑色触屏手机，屏幕上下留有黑色边框，底部有圆形主屏幕按钮。'],
 macbook:['初代 MacBook Air','展开的银色楔形笔记本，黑色键盘与较宽的触控板位于屏幕下方。'],
 ipad:['初代 iPad','大屏黑边平板，四角圆润，屏幕下方保留圆形主屏幕按钮。'],
 watch:['初代 Apple Watch','方形圆角手表，白色表带，表壳侧面有可旋转表冠。'],
 airpods:['第一代 AirPods','打开的白色充电盒，两只耳机都有较长的白色耳柄。'],
 vision:['Apple Vision Pro','弧面玻璃面罩连接织物头带，整体像一副大型护目镜。'],
};
const records=[];
function add(id,device,prompt,answer,wrong,explanation,alt,art,factKeys=[],sources){
 const qid=`visual-${id}`;
 records.push({id:qid,category:device?devices.find(d=>d.id===device).question.category:'mac',difficulty:'easy',kind:'visual',topic:'visual',family:`visual-${device||id}`,factKeys:factKeys.length?factKeys:[`visual:${id}`],tag:device?'看图识物':'接口辨认',prompt,answer,options:shuffle([answer,...wrong],seeded(qid)),explanation,sources:sources||devices.find(d=>d.id===device).question.sources,media:{asset:`${id}.svg`,alt,caption:art.type==='port'?'接口外形示意，非工程尺寸图':'原创产品示意，非实物照片',fallback:`图像描述：${alt}`},art});
}
for(const d of devices){
 const [answer,alt]=specs[d.id];
 const pool=d.id==='mac'||d.id==='imac'?['Macintosh 128K','iMac G3','Power Mac G4 Cube','Mac Pro（2013）']:d.id==='ipod'?['第四代 iPod','iPod shuffle（第一代）','iPod touch（第一代）','iPod nano（第一代）']:d.id==='iphone'?['初代 iPhone','iPhone X','iPhone 4','iPhone 6']:d.id==='macbook'?['初代 MacBook Air','PowerBook G3','iBook G3','MacBook Pro（2016）']:d.id==='ipad'?['初代 iPad','iPad mini（第一代）','iPad Pro（2018）','iPad Air（第四代）']:d.id==='watch'?['初代 Apple Watch','Apple Watch Ultra','iPod nano（第六代）','AirTag']:d.id==='airpods'?['第一代 AirPods','AirPods Pro','AirPods Max','EarPods']:['Apple Vision Pro','iSight','Studio Display','Apple TV'];
 add(`identify-${d.id}`,d.id,`图中这款${({mac:'米白色一体机',imac:'半透明一体机',ipod:'圆环控制的播放器',iphone:'黑色触屏手机',macbook:'银色楔形笔记本',ipad:'宽黑边平板',watch:'方形手表',airpods:'长柄无线耳机',vision:'弧面玻璃头显'})[d.id]}，属于哪一款产品？`,answer,pool.filter(x=>x!==answer),`图中的外形对应${answer}。${alt}`,alt,{type:'product',device:d.id},[`identity:${d.id}`]);
}
const details=[
 ['mac-floppy','mac','图中圈出的狭长开口，用来放入什么？','3.5 英寸软盘',['SIM 卡','游戏光盘','存储卡'],'Macintosh 128K 的机身内置 3.5 英寸软盘驱动器。圈出的是插入软盘的位置。',[262,274,44],'Macintosh 正面屏幕下方的窄槽被圈出。'],
 ['mac-crt','mac','图中圈出的显示部分，采用哪种显示技术？','CRT 阴极射线管',['OLED','电子墨水','MicroLED'],'1984 年 Macintosh 128K 使用内置黑白 CRT 显示器，机身厚度与这种显示结构有关。',[232,164,76],'米白色一体机厚实机身中的方形黑白显示器被圈出。'],
 ['imac-handle','imac','图中圈出的透明部件，主要是用来做什么的？','提起和搬动电脑',['装入光盘','扫描指纹','连接电话线'],'iMac G3 外壳顶部设计了提手，方便挪动这台一体机。',[297,107,32],'蓝色一体机顶部弯曲的透明提手被圈出。'],
 ['imac-cd','imac','这台初代 iMac 正面的光驱区域，用来读取哪种介质？','CD 光盘',['3.5 英寸软盘','SD 存储卡','游戏卡带'],'初代 iMac G3 内置 CD-ROM 光驱；图中以闭合的光驱前面板概括这个位置。',[172,303,56],'邦迪蓝一体机正面显示器下方的光驱区域被圈出。'],
 ['ipod-wheel','ipod','圈出的圆形控制区域，除了按键还能怎样浏览列表？','沿圆环滑动手指',['对着圆环说话','用笔尖画二维码','把整台设备旋转一圈'],'第四代 iPod 的 Click Wheel 将触摸滚动与实体按键合在一起；圆环本身并非初代的机械滚轮。',[239,272,66,-7],'白色音乐播放器下部的大圆环被圈出。'],
 ['ipod-center','ipod','图中圈出的圆环中央按钮，主要承担哪种操作？','选择或确认项目',['弹出光盘','打开相机快门','取出电池'],'iPod 的中央选择按钮用于选择项目，外围 Click Wheel 用于滚动和其他控制。',[239,272,26,-7],'音乐播放器控制圆环正中央的小圆按钮被圈出。'],
 ['iphone-home','iphone','图中圈出的初代 iPhone 按钮，最主要的用途是什么？','返回主屏幕',['识别 Face ID','弹出键盘','旋转摄像头'],'初代 iPhone 保留实体主屏幕按钮，按下可以回到主屏幕；这代并没有 Touch ID。',[242,348,22,7],'黑色触屏手机底部单独的圆形按钮被圈出。'],
 ['iphone-earpiece','iphone','图中圈出的初代 iPhone 顶部狭缝，主要是什么？','通话听筒',['Face ID 点阵投影器','指纹传感器','软盘槽'],'屏幕上方的狭缝是通话听筒的位置，初代 iPhone 尚无 Face ID 与前置摄像头。',[242,81,34,7],'触屏手机正面最上方的一条狭长开口被圈出。'],
 ['macbook-trackpad','macbook','这台 MacBook Air 圈出的输入区域，支持什么操作？','多点触控手势',['插入软盘','直接扫描纸质文件','收纳光盘'],'初代 MacBook Air 的大尺寸触控板支持多点触控手势，包括缩放与旋转等。',{x:177,y:342,width:126,height:28},'银色笔记本键盘下方中央的触控板被圈出。'],
 ['macbook-keyboard','macbook','这台初代 MacBook Air 圈出的键盘，有什么适合暗处使用的设计？','键盘背光',['每个按键都是小投影仪','按键可变成充电电池','必须外接台灯才能输入'],'2008 年初代 MacBook Air 配备全尺寸背光键盘，便于在光线较暗时辨认按键。',{x:77,y:292,width:326,height:46},'银色笔记本的整块黑色键盘被圈出。'],
 ['ipad-home','ipad','初代 iPad 圈出的按钮，在触屏之外保留了什么主要操作？','一按返回主屏幕',['指纹解锁','通过 Face ID 认证','弹出手写笔'],'初代 iPad 配有实体主屏幕按钮，Touch ID 属于后来代际。',[242,359,21,-7],'大屏黑边平板下方的圆形主屏幕按钮被圈出。'],
 ['watch-crown','watch','图中圈出的 Apple Watch 侧面旋钮叫什么？','Digital Crown 数码表冠',['SIM 卡托','耳机音量滚轮','磁吸充电口'],'数码表冠是 Apple Watch 的重要输入部件，旋转可缩放或滚动，按下有对应导航功能。',[319,195,21,10],'方形手表右侧上方带纹理的小旋钮被圈出。'],
 ['watch-rings','watch','图中圈出的三色圆环，属于哪种功能界面？','健身活动',['指南针校准','蜂窝信号强度','电池循环次数'],'Apple Watch 的活动圆环呈现活动能量、锻炼与站立等日常活动目标。',[242,231,43,10],'手表屏幕中央的红绿蓝三色同心圆环被圈出。'],
 ['airpods-case','airpods','图中圈出的盒子，除了收纳耳机还承担什么主要功能？','为耳机充电',['增强蜂窝信号','给耳机增加屏幕','把耳机变成有线'],'第一代 AirPods 的盒子兼具收纳和充电功能，盒内电池可为耳机补充电量。',[241,320,75],'两只长柄白色耳机下方的白色收纳盒被圈出。'],
 ['vision-band','vision','图中圈出的织物部件，主要服务于什么？','固定佩戴并分散头部受力',['投影到墙壁','容纳光盘','给眼睛扫描虹膜'],'Vision Pro 使用头带等结构固定设备、调节贴合度；图中圈出的是头部佩戴结构。',[265,135,65],'弧面玻璃头显后方连接两侧的织物头带被圈出。'],
];
for(const [id,device,prompt,answer,wrong,explanation,focus,alt] of details){
 const keys=id==='ipod-wheel'?['gallery:ipod-wheel']:id==='watch-rings'?['gallery:watch-rings']:[`detail:${id}`];
 add(id,device,prompt,answer,wrong,explanation,alt,{type:'detail',device,focus},keys);
}
const ports=[
 ['usb-a','USB-A','长方形开口内有偏向一侧的舌片。','USB-A 的长方形外形很常见，外形本身不能直接确定 USB 数据速率。'],
 ['usb-c','USB-C','左右对称的扁圆形开口，中央有细长舌片。','USB-C 描述连接器外形。相同外形可能支持不同 USB 或雷雳能力，应核对设备规格。'],
 ['hdmi','HDMI','扁平开口的下侧两角向内收拢，形成近似梯形。','HDMI 常用来连接电视和显示器，同时传输数字视频及音频。'],
 ['mini-dp','Mini DisplayPort 外形','近似小长方形的接口，下方两个角有斜切，旁边标有显示器符号。','Mini DisplayPort 与早期雷雳接口外形相同。图旁使用显示器标识，实际能力仍需查型号和端口标识。'],
 ['firewire','六针 FireWire 400','一端带斜切的六边形插口，内部排列六个接点。','这是常见六针 FireWire 400 外形；FireWire 也有其他针数和形状。'],
 ['magsafe','MagSafe 2','横向很扁的磁吸充电接口，内部有一排五个金属触点。','MagSafe 2 是部分旧款 Mac 笔记本的磁吸电源接口，注意与原代及 MagSafe 3 区分。'],
 ['audio','3.5 毫米音频接口','一个圆形插孔，外侧有同心圆形金属边缘。','这种圆形插孔常用于连接耳机和音频设备，输入输出等能力依具体 Mac 型号而异。'],
 ['ethernet','RJ45 以太网接口','较高的长方形插口，上方有供卡扣进入的缺口，内侧排列八个触点。','RJ45 以太网接口可连接网线；接口外形不能直接判断支持百兆、千兆还是更高速率。'],
];
for(const [id,answer,alt,explanation] of ports){const wrong=ports.filter(p=>p[0]!==id).slice(0,3).map(p=>p[1]);add(`port-${id}`,null,`图中${({"usb-a":'带偏置舌片的长方形',"usb-c":'左右对称的扁圆形',hdmi:'下方两角向内收拢的',"mini-dp":'旁边有显示器标识的小型',firewire:'排列六个接点的',magsafe:'带一排五个磁吸触点的',audio:'圆形',ethernet:'带卡扣缺口与八个触点的'})[id]}接口叫什么？`,answer,wrong,explanation,alt,{type:'port',port:id},[`port:${id}`],[portsSource]);}
export const visualQuestions=records.map(({art,...q})=>q);
export const visualArtwork=records.map(q=>({id:q.id,asset:q.media.asset,art:q.art}));

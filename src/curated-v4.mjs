// Each row describes one independently checked claim. Stable IDs survive edits.
import {seeded,shuffle} from './engine.mjs';
const news=p=>`https://www.apple.com/newsroom/${p}/`;
const questions=[];
function group(id,category,path,text){
  for(const line of text.trim().split('\n')){
    const [key,prompt,answer,a,b,c,explanation]=line.split('|');
    if(!explanation)throw Error(`Malformed authored row: ${id}/${key}`);
    const qid=`v4-${id}-${key}`;
    questions.push({id:qid,category,difficulty:'medium',kind:'trivia',topic:'stories',family:`v4-${id}`,factKeys:[`${id}:${key}`],tag:'产品与设计',prompt,answer,options:shuffle([answer,a,b,c],seeded(qid)),explanation,sources:[news(path)]});
  }
}
group('cube','mac','2000/07/19Apple-Introduces-Revolutionary',`
cooling|2000 年的 Power Mac G4 Cube，靠什么实现近乎安静的散热？|无风扇的垂直通风设计|底座内置的隐藏风扇|外接单独的散热风箱|液冷管路与散热器|G4 Cube 的中央垂直通道利用空气流动散热，原始设计无需风扇。
core|给 G4 Cube 加内存时，内部电子组件怎样取出？|整组组件从外壳中提起|先从侧面滑出主板|从光驱开口逐件拆出|只能由工厂更换整个外壳|Apple 将电子组件设计成可整体提起的结构，以便接触主要部件并扩充内存或 AirPort 卡。
optical|G4 Cube 的吸入式 DVD 光驱开口位于哪里？|机身顶部|机身正面下方|机身右侧|机身背面接口上方|G4 Cube 把吸入式 DVD 光驱设置在顶部，与常见塔式主机的正面布局不同。
speakers|G4 Cube 随机附带的音箱，是 Apple 与哪家公司相关的设计？|Harman Kardon|Bose|JBL|Bang & Olufsen|发布资料列出一对由 Apple 设计的 Harman Kardon 音箱。
adc|与 G4 Cube 同期推出的显示器，ADC 一条线合并了哪些连接？|视频、USB 数据和显示器供电|视频和音频，电源另接|只有数字视频与模拟视频|以太网、USB 数据和供电|Apple Display Connector 把模拟及数字视频、USB 数据和显示器电源集中到一个连接器。
shape|Power Mac G4 Cube 的立方体主体，外侧还有什么设计？|悬置于透明外壳中|直接露出的铝制散热框架|嵌入显示器背面|完全不透明的金属方盒|这款桌面主机把约八英寸的立方体计算组件放在透明外壳中，突出悬浮观感。
`);
group('safari','ecosystem','2003/01/07Apple-Unveils-Safari',`
engine|2003 年初版 Safari 的渲染引擎，源自哪个开源项目的技术？|KDE Konqueror 的 KHTML|Mozilla 的 Gecko|微软的 Trident|Opera 的 Presto|Apple 的首发资料明确说明渲染引擎基于 KHTML，并承诺把改进贡献给开源社区。
snapback|早期 Safari 的 SnapBack，主要让用户快速回到哪里？|搜索结果或网站的顶层入口|刚关闭的标签页|上一次下载的文件|浏览器上次退出时的会话|SnapBack 帮用户在层层浏览链接后迅速返回搜索结果或最初网站入口。
search|Safari 在 2003 年亮相时，工具栏直接整合了哪家的搜索？|Google|Yahoo!|MSN Search|AltaVista|首发 Safari 把 Google 搜索整合进工具栏，这里限定为 2003 年的历史版本。
popups|初版 Safari 提供哪种可选功能，减少网页突然弹出的广告窗口？|弹出式窗口拦截|页面阅读模式|全站第三方 Cookie 清除|自动跳过视频广告|首发资料列出可选的 pop-up blocking，针对侵入性的弹出窗口。
contacts|Safari 最初与 Mac 地址簿整合时，会把联系人中的什么纳入书签库？|联系人记录的网站地址|联系人的电子邮件附件|联系人的照片相册|联系人的聊天记录|初版 Safari 可把地址簿中记录的网站，如个人主页，整合进书签库。
beta|2003 年 1 月首次公开的 Safari，用户拿到的是哪种版本？|可免费下载的公开测试版|99 美元买断的正式版|随新 Mac 独占的预装版|只向付费开发者提供的预览版|Safari 首次亮相时提供免费公开测试版，正式 1.0 版在同年稍后发布。
`);
group('shuffle','audio','2005/01/11Apple-Introduces-iPod-shuffle',`
autofill|第一代 iPod shuffle 配合 iTunes 的 AutoFill，可以一键做什么？|选出合适数量的歌曲填满播放器|自动补齐专辑封面|只同步播放次数最多的歌曲|把所有歌曲换成随机铃声|AutoFill 会从电脑上的音乐库自动选歌，填充 iPod shuffle 的可用空间。
order|iPod shuffle 的名字强调随机播放，它能按顺序播放专辑吗？|能，用背面的开关切换|不能，始终随机播放|只能在电脑上预设顺序|只有接到底座时可以|初代 shuffle 背面的开关允许用户在随机与顺序播放之间切换。
usb|第一代 iPod shuffle 怎样直接连接电脑充电和传歌？|把机身插入 USB 口|必须使用 FireWire 线缆|只通过专用无线底座|通过耳机口连接同步线|初代 shuffle 带直接插入 USB 口的插头，可从 Mac 或 PC 充电与同步。
files|2005 年的 iPod shuffle，除了放音乐还可兼任什么？|存放和交换文件的 USB 闪存盘|只能用来播放音乐|只能保存购买过的专辑|只能保存专辑封面照片|Apple 当年介绍它也可用作便携 USB 闪存盘，在电脑间备份和交换文件。
lanyard|第一代 iPod shuffle 的包装里，有什么让它开箱就能挂着用？|挂绳|背面的金属衣夹|腕带式表带|带磁铁的胸针扣|初代 shuffle 随附挂绳；后续代际的夹子外形不能直接套到这一代上。
pack|第一代 iPod shuffle 的可选外接电池包，装入的是哪种电池？|两节 AAA 电池|一节 AA 电池|两节 CR2032 电池|两节 D 型电池|2005 年的可选电池包使用两节 AAA 电池，官方称可提供额外播放时间。
`);
group('macmini','mac','2005/01/11Apple-Introduces-Mac-mini',`
byod|2005 年初代 Mac mini 的购买思路，要求用户自己准备哪些主要外设？|显示器、键盘和鼠标|显示器、内存和电源|键盘、硬盘与光驱|鼠标、显卡与无线网卡|初代 Mac mini 是小型台式主机，乔布斯在新闻稿中强调接上自己的显示器、键盘和鼠标即可使用。
processor|初代 Mac mini 还没用 Intel 或 Apple 芯片，它用的是什么？|PowerPC G4|PowerPC G5|Intel Pentium M|Apple A4|2005 年初代 Mac mini 使用 PowerPC G4，后来的 Intel 和 Apple 芯片版本属于其他代际。
combo|初代 Mac mini 标配的 Combo 光驱，能完成哪种组合？|读 DVD、刻录 CD|读 CD、刻录 DVD|只能读取 CD 和 DVD|刻录 CD、DVD 和蓝光|当年的 Combo 是 DVD-ROM/CD-RW，可以播放 DVD 并刻录 CD，刻录 DVD 的 SuperDrive 是选配。
video|初代 Mac mini 连接传统 VGA 显示器时，主要借助什么？|DVI 输出配合转接器|直接使用 VGA 插孔|使用内置 Mini DisplayPort|使用 HDMI 转接线|初代 Mac mini 提供 DVI 显示输出，随附转接器可连接 VGA 显示器。
wireless|2005 年初代 Mac mini 的 Wi-Fi 和蓝牙配置，哪种说法符合首发资料？|作为可选配置提供|Wi-Fi 标配，蓝牙完全不支持|蓝牙标配，Wi-Fi 完全不支持|两者在首发机型上都已标配|初代 Mac mini 提供 AirPort Extreme 卡和内部蓝牙模块的选配，不能套用今天的标配习惯。
modem|初代 Mac mini 除以太网外，还内置了哪种今天较少见的上网硬件？|56K 拨号调制解调器|ADSL 调制解调器|ISDN 数字终端|蜂窝数据调制解调器|首发 Mac mini 配有 56K V.92 modem，可使用当时常见的电话线路拨号接入。
`);
group('nano','audio','2005/09/07Apple-Introduces-iPod-nano',`
pencil|发布第一代 iPod nano 时，Apple 用哪种文具来比较机身厚度？|普通 2 号铅笔|一张标准信用卡|一盒 CD 光盘盒|一支圆珠笔的笔芯|2005 年发布资料强调 nano 比一支标准 2 号铅笔还薄，用熟悉物体直观展示尺寸。
colors|第一代 iPod nano 首发时，官方提供哪两种机身颜色？|黑色与白色|银色与黑色|白色与银色|蓝色与粉色|初代 nano 首发提供黑、白两种设计，多彩铝制机身是后来代际的风格。
screen|第一代 iPod nano 的屏幕，相比只能显示文字的想象，实际能做什么？|显示彩色专辑封面与照片|只有单色文字菜单|只能显示时间与电量|只有一排 LED 指示灯|初代 nano 配备彩色屏幕，可以显示专辑封面、照片幻灯片和全彩游戏。
tubes|当年给 iPod nano 配套的彩色 nano Tubes，主要是什么？|可操作按键的保护套|可替换机身面板|耳机线上的收纳套管|连接汽车音响的转接器|nano Tubes 是彩色半透明保护套，戴上后仍可操作 Click Wheel 等功能。
connector|第一代 iPod nano 沿用了哪种接口，方便接入当时的 iPod 配件？|30 针底座连接器|FireWire 400|Lightning|USB-C|首代 nano 采用 iPod 与 iPod mini 的 30 针底座接口，兼容当时大量音箱和车载配件。
extras|第一代 iPod nano 内置的新小工具，哪一组确实被首发资料列出？|秒表、世界时钟和屏幕锁|指南针、计算器和语音备忘录|地图、邮件和网页浏览器|心率、睡眠和海拔记录|初代 nano 的首发功能包含秒表、世界时钟与屏幕锁，音乐之外也有轻量工具。
`);
group('ipodtouch','audio','2007/09/05Apple-Unveils-iPod-touch',`
wifi|2007 年的 iPod touch，为 iPod 产品线首次带来了哪种联网能力？|内置 Wi-Fi|内置蓝牙音乐串流|内置蜂窝数据网络|内置有线以太网|首发资料称 iPod touch 是第一款内置 Wi-Fi 的 iPod，支持浏览网页和在线音乐商店。
coverflow|第一代 iPod touch 播放音乐时横过机身，会出现什么浏览方式？|按专辑封面翻阅的 Cover Flow|按文件名排列的双栏列表|全屏实时歌词|音频均衡器控制台|内置加速度传感器感知横向姿态，在音乐中切换到 Cover Flow 专辑封面浏览。
light|第一代 iPod touch 可以自动调节屏幕亮度，依靠什么？|环境光传感器|屏幕压力传感器|加速度传感器|触控屏的电容变化|这代 iPod touch 内置环境光传感器，可根据周围光线自动调整显示亮度。
youtube|第一代 iPod touch 的首发联网应用里，哪家视频网站有专门的 App？|YouTube|Vimeo|Dailymotion|Hulu|2007 年首发的 iPod touch 包含 YouTube 应用，通过 Wi-Fi 浏览和观看视频。
starbucks|当年的 iPod touch 与部分美国星巴克合作，顾客可以发现什么？|店里正在或最近播放的歌曲|门店 Wi-Fi 的完整访问历史|咖啡杯条码对应的会员积分|附近所有用户的播放列表|合作让用户识别参与门店正在或最近播放的歌曲，并预览、购买和下载。
purchased|用 iPod touch 的 Wi-Fi 音乐商店买到的歌曲，下次同步电脑时怎样处理？|自动上传到电脑的 iTunes 音乐库|必须在电脑上再购买一次|只保留在设备，不会同步回去|仅把试听片段同步回电脑|首发资料说明，直接下载到 iPod touch 的音乐会在下次同步时自动加入电脑的 iTunes 音乐库。
`);
group('appletv','ecosystem','2007/01/09Apple-TV-Coming-to-Your-Living-Room',`
harddrive|初代 Apple TV 和后来许多流媒体盒子相比，内部有什么明显的时代特征？|用 40GB 硬盘保存内容|仅靠在线串流且不保存媒体|用内置 DVD 光驱读取影片|默认使用可拆卸 SD 卡|2007 年初代 Apple TV 内置 40GB 硬盘，用来保存来自 iTunes 的视频、音乐和照片。
output|2007 年初代 Apple TV 公布的高清输出等级是什么？|720p|1080p|1080i|4K|这里限定 2007 年初代产品，首发资料写的是高清 720p 输出。
sync|初代 Apple TV 自动同步内容时，主要对应几台电脑的资料库？|一台电脑|五台电脑同时自动同步|只能串流，无法自动同步|两台电脑合并同步|原始设计可从一台电脑自动同步，并从额外最多五台电脑串流内容。
remote|初代 Apple TV 在客厅里浏览内容，随附的主要控制工具是什么？|Apple Remote|带触控面的 Siri Remote|Magic Mouse|iPod 的 Click Wheel|初代产品以简单的 Apple Remote 遥控器浏览电视上的媒体界面。
component|除了 HDMI，初代 Apple TV 还保留了哪种视频输出？|色差分量视频|复合视频接口|VGA 接口|Mini DisplayPort|首发硬件同时提供 HDMI 和 component video，体现当时电视连接标准的过渡。
pc|初代 Apple TV 接收电脑的 iTunes 内容，只限 Mac 吗？|也支持 Windows PC|只支持 Mac|只支持搭配 iPod 的电脑|只支持 Mac OS X Server|2007 年新闻稿明确提到可从 Mac 或 PC 获取 iTunes 内容。
`);
group('finalcut','ecosystem','2011/06/21Apple-Revolutionizes-Video-Editing-With-Final-Cut-Pro-X',`
magnetic|Final Cut Pro X 的 Magnetic Timeline，核心剪辑思路是什么？|片段移动时其他片段自动避让衔接|把视频锁定到固定编号轨道|自动把所有音频与画面分离|每次移动都强制留下等长空隙|磁性时间线允许灵活排列片段，其他片段随之移动，减少手动处理空隙和碰撞。
connections|Final Cut Pro X 的 Clip Connections，主要保证什么？|字幕音效等随关联主片段一起移动|只统一片段文件的名称|只在导出时临时同步|把所有声音固定在原时间点|片段连接把主线内容与字幕、音效等关联，移动主片段时保持它们的同步关系。
compound|Final Cut Pro X 把多个关联元素做成 Compound Clip 后，可以怎样编辑？|作为一个复合片段处理|只能分散在不同项目里编辑|必须先导出成不可拆开的成片|只能合并视频，不能包含音频|复合片段把相关故事元素组合为一个单元，方便整体剪辑。
auditions|Final Cut Pro X 的 Auditions 功能，主要帮助剪辑师做什么？|比较同一位置的不同候选镜头|批量改变所有素材的播放速度|自动检查镜头对焦是否清晰|统一所有音轨的峰值音量|Auditions 可以在一组候选片段间切换，快速比较不同素材的效果。
analysis|Final Cut Pro X 导入素材时的自动分析，会根据什么帮助归类？|镜头类型、媒体和画面人物等信息|只按素材文件名长度|只按文件夹创建顺序|只按摄像机品牌分组|自动分析为素材添加信息，智能精选可按近景、中景、远景、媒体类型和人数等归类。
background|Final Cut Pro X 的后台渲染，想减少哪种工作中断？|等待渲染完成才能继续剪辑|只能停止剪辑后手动渲染|必须等整个项目导出后才能预览|每次剪辑都先生成一份完整影片|2011 年版本强调利用多线程和 GPU 在后台渲染，让用户继续进行编辑。
`);
group('logic','ecosystem','2013/07/16Apple-Unveils-Logic-Pro-X',`
drummer|Logic Pro X 的 Drummer，在创作中扮演什么角色？|随歌曲演奏的虚拟鼓手|把任何录音自动变成鼓谱|只提供固定节拍器声音|只管理外接鼓机的固件|Drummer 根据用户方向生成不同风格的鼓声演奏，是虚拟伴奏工具。
flexpitch|Logic Pro X 的 Flex Pitch，主要编辑录音中的什么？|音符的音高|音轨的左右声像|工程的采样率|插件的加载顺序|Flex Pitch 可在音频波形中处理单个音符，修正跑调人声或改变旋律。
remote|2013 年的 Logic Remote，让哪种设备变成 Logic 的无线控制界面？|iPad|iPhone 3G|iPod classic|Apple TV|Logic Remote 利用 iPad 的多点触控屏提供录音、混音和乐器演奏等控制。
stacks|Logic Pro X 的 Track Stacks，能够怎样组织多个轨道？|组合折叠并构建层叠乐器|只把多个工程打成压缩包|把所有轨道永久混成一个音频文件|按轨道名称自动删除重复轨|Track Stacks 能整理和折叠多条轨道，也可把它们组合成层叠乐器。
smart|Logic Pro X 的 Smart Controls，强调一次动作可以控制什么？|多个插件与参数|只能控制当前轨的音量|只切换不同 MIDI 键盘|只把窗口排列到同一显示器|Smart Controls 将多个音色参数集中，帮助用一个动作快速塑造声音。
arpeggiator|Logic Pro X 的 Arpeggiator，会把简单和弦变成什么？|展开演奏的琶音序列|自动生成歌词|将立体声合并为单声道|自动移除所有鼓声|琶音器将同时按下的和弦音按一定方式展开，形成更复杂的演奏。
`);
group('isight','mac','2003/06/23Apple-Introduces-iChat-AV-and-iSight',`
cable|2003 年独立式 iSight 摄像头，一条什么线同时传输音视频并供电？|FireWire|USB 2.0|Thunderbolt 1|独立音频线加电源线|外置 iSight 使用单条 FireWire 线提供音频、视频和电源。
focus|2003 年外置 iSight 镜头具备哪种对焦方式？|自动对焦|固定焦距、无自动对焦|通过外置机械摇杆对焦|仅提供数码锐化而无对焦结构|Apple 为这款铝合金外置摄像头配备了自动对焦镜头和 CCD 传感器。
mic|外置 iSight 对视频通话的拾音，采用什么设计？|内置降环境噪声的麦克风|必须另接外置麦克风|只支持摄像机自带的模拟音频线|只能使用电脑内置麦克风|iSight 自带双元件降噪麦克风，以减少环境噪声并提供清晰语音。
mount|外置 iSight 放在屏幕上方后，怎样调节拍摄朝向？|利用内置倾斜与旋转机构|只能固定朝向，无法调节|只能左右旋转，不能倾斜|必须使用独立三脚架调节|外置 iSight 的支架结构支持倾斜和旋转，便于对准通话者。
firewirecamera|2003 年 iChat AV 视频通话，是否必须搭配 Apple 的 iSight？|也可以使用兼容的 FireWire 摄像机|只能使用 iSight|只能使用内置 FaceTime 摄像头|必须接 DV 磁带转接盒才可用|当时 iChat AV 可与其他 FireWire 视频摄像机配合，iSight 是 Apple 设计的整合方案。
dialup|iChat AV 当年除了宽带视频通话，还强调哪种较低带宽的用法？|拨号网络上的语音通话|拨号网络上的全分辨率视频通话|用电话线路直接传输录制光盘|只允许局域网文字聊天|2003 年资料明确区分宽带视频与拨号连接也能进行的音频通话。
`);
group('keynote','ecosystem','2003/01/07Apple-Unveils-Keynote',`
themes|Keynote 在 2003 年最初登场时，内置主题会统一哪些内容？|背景、字体、配色与图表等|只统一幻灯片背景图|只提供图片，不定义文字样式|只用于导出文件的命名|首发的十二套主题提供协调的背景、字体、色彩、项目符号、表格和图表。
price|Keynote 刚在 2003 年推出时，美国建议零售价是多少？|99 美元|免费|49 美元|199 美元|这里讨论首发历史定价，2003 年 Keynote 单独销售的美国建议零售价是 99 美元。
powerpoint|初版 Keynote 面对别人的 PowerPoint 文件，提供哪种兼容能力？|导入和导出 PowerPoint 演示文稿|只能导入，完全不能导出|只能查看截图，不能编辑|只能交换演讲者备注|Apple 首发资料强调与 PowerPoint 等常见格式的交换能力。
navigator|初版 Keynote 的幻灯片导航器，怎样帮助组织长演示文稿？|用缩略图分组并折叠展开|只能按文件名排序|必须拆成多个文件才可分组|每次只允许显示一张缩略图|导航器让用户总览演示文稿，并对缩略图按组折叠和展开。
alignment|Keynote 帮文字与图形准确摆放，初版就提供了什么辅助？|对齐参考线与标尺|只能手动填写每个坐标|只能借助外部绘图软件|只有全屏演示时才显示网格|初版 Keynote 提供 alignment guides 和 rulers，以辅助精确放置页面元素。
charts|初版 Keynote 为图表录入数据时，除了自身编辑器，还可从哪些软件导入？|Excel 和 AppleWorks|只能从文本编辑器导入|只能从系统通讯录导入|只能从 iTunes 导入|发布资料明确提及可从 Excel、AppleWorks 导入图表和表格数据。
`);
group('macpro','mac','2013/10/23Introducing-the-All-New-Mac-Pro-The-Most-Radical-Mac-Ever',`
thermal|2013 年圆筒 Mac Pro，把主要处理部件的散热围绕什么组织？|统一散热核心|每块显卡独立安装封闭散热盒|完全无风扇的被动散热|连接显示器借用其散热系统|统一散热核心让各处理器共享散热能力，配合单个风扇组织气流。
gpus|2013 年圆筒 Mac Pro 的图形配置，最有代表性的设计是什么？|双 AMD FirePro GPU|单颗 NVIDIA GeForce GPU|只用 Intel 核心显卡|双 Intel Iris 集成显卡|这代 Mac Pro 标准配置即采用双工作站级 AMD FirePro 图形处理器。
flash|2013 年圆筒 Mac Pro 的内置存储，采用什么方案？|基于 PCIe 的闪存|双 3.5 英寸机械硬盘|单 2.5 英寸 SATA 机械硬盘|只依靠外接雷雳存储|这代 Mac Pro 将 PCIe 闪存作为内置存储，区别于之前常见的机械硬盘结构。
expansion|2013 年圆筒 Mac Pro 依靠哪种端口，大量扩展外部专业设备？|六个 Thunderbolt 2 端口|六个 USB-C 端口|四个 PCIe 全尺寸插槽|八个 FireWire 400 端口|机身提供六个 Thunderbolt 2 端口，可连接存储、扩展箱及音视频设备。
ecc|2013 年圆筒 Mac Pro 的 ECC 内存，名称中的 ECC 强调什么能力？|纠正内存中的特定位错误|扩展显卡显存容量|自动压缩全部内存内容|用闪存替代系统内存|ECC 是 Error-Correcting Code，使用纠错编码提高内存数据可靠性；这代 Mac Pro 配备 ECC DDR3。
volume|2013 年圆筒 Mac Pro 相较上一代塔式机，Apple 宣传的体积关系是什么？|约为上一代的八分之一|约为上一代的四分之一|约为上一代的一半|约为上一代的十六分之一|2013 年发布资料用上一代八分之一的体积描述新的紧凑设计，这是体积比较。
`);
group('mightymouse','mac','2005/08/02Apple-Introduces-Mighty-Mouse',`
ball|2005 年 Mighty Mouse 顶部的小滚动球，能朝哪些方向滚动内容？|纵向、横向甚至斜向|仅能纵向滚动|仅能横向滚动|只能在水平与垂直之间切换|Scroll Ball 支持任意方向滚动，是它区别于普通单轴滚轮的设计重点。
buttons|Mighty Mouse 外观看着简洁，最多可以编程几种按键？|四个|一个|两个|三个|Mighty Mouse 最多提供四个独立可编程按键，兼顾单键和多键使用习惯。
squeeze|Mighty Mouse 怎样触发机身侧面的按键操作？|挤压两侧|双击滚动球|同时按住左右上壳|滑动整个顶部外壳|除了左右点击和按下滚动球，挤压鼠标两侧也可触发可编程操作。
shell|Mighty Mouse 怎样在看似单一的上壳上区分左右点击？|用触摸传感器识别点击位置|用机身倾斜角度决定左右键|完全通过 Mac 软件猜测|必须按住键盘 Option 再点击|它的无缝上壳结合触摸传感器，让左右侧点击分别对应主要或次要按键。
hands|Mighty Mouse 的外形，设计给哪种惯用手？|左手与右手均可|只适合右手|只适合左手|必须更换外壳才能换手|首发资料强调其外形适合左右手，不能把对称造型等同于仅供某一侧使用。
windows|2005 年的 Mighty Mouse，可以连接 Windows 电脑吗？|可以，支持当时的 Windows 2000 和 XP|不能，只能接 Mac|只有蓝牙版能连接 Windows|只能作基本滚轮，不能移动光标|原始规格列出 Mac OS X、Windows 2000 和 Windows XP；部分自定义功能另有系统要求。
`);
group('ipodhifi','audio','2006/02/28Apple-Announces-iPod-Hi-Fi',`
remote|iPod Hi-Fi 随附哪种工具，让人坐在房间另一端也能选歌调音量？|Apple Remote|带触控板的 Siri Remote|iPod 专用有线线控器|必须购买独立遥控底座|2006 年 iPod Hi-Fi 包含 Apple Remote，供用户远距离控制歌曲与音量。
handles|iPod Hi-Fi 这只大型音箱，机身加入了什么方便搬动？|提手|可折叠肩背带|底部滚轮|伸缩拉杆|Apple 在音箱上设计提手，便于把这套音响从一个房间搬到另一个地方。
grille|iPod Hi-Fi 正面的扬声器网罩，采用什么结构？|可拆卸并以卡扣固定|与外壳粘合且不可取下|与 iPod 底座一体开合|只能用螺丝刀拆卸|它配有可拆卸前网罩，使用精密安装卡扣定位。
powersupply|iPod Hi-Fi 接交流电时，电源设计有什么特点？|通用电源内置于机身|必须外接大型电源砖|只能使用电池供电|必须使用 iPod 自带电源适配器|这款音箱把通用电源放进一体机身，减少外置电源砖。
input|iPod Hi-Fi 的 3.5 毫米辅助输入，能接收什么信号？|模拟或数字音频|只接受模拟音频|只接受数字光纤音频|只用于连接有线麦克风|Apple 将这个接口描述为双用途 3.5 毫米输入，可接受模拟或数字音频。
recharge|把兼容 iPod 放进 iPod Hi-Fi 底座后，音箱还会帮它做什么？|自动充电|只播放，不提供充电|只在关机后充电|只能给第五代 iPod 充电|iPod Hi-Fi 与兼容底座接口的 iPod 整合，播放时也可为 iPod 自动充电。
`);
group('a11y24','ecosystem','2024/05/apple-announces-new-accessibility-features-including-eye-tracking',`
eyes|Apple 在 2024 年公布的眼动追踪，让用户主要用什么操作兼容 iPhone 和 iPad？|眼睛注视|头部左右转动|外接鼠标点击|只靠手指在屏幕上滑动|眼动追踪为有肢体障碍的用户提供以眼睛浏览与控制界面的方式，设备兼容性另有限制。
camera|iPhone 与 iPad 的眼动追踪校准，利用了设备的哪种硬件？|前置摄像头|后置主摄像头|Face ID 点阵投影器独立完成|必须购买外接红外摄像头|2024 年介绍的方案使用前置摄像头设置与校准，无需另外购买眼动追踪配件。
privacy|眼动追踪用来设置和控制的数据，按 Apple 介绍主要在哪里处理保存？|设备本地|全部上传云端后实时处理|默认与所有开发者共享|必须公开保存到 iCloud 链接|Apple 表示相关机器学习在设备端完成，设置与控制数据留在设备上且不会与 Apple 共享。
dwell|眼动追踪中注视某个控件一段时间后触发它，对应什么机制？|停留控制|双击侧边按钮|摇动机身确认|必须再用手指点一下|Dwell Control 允许用户通过持续注视来激活界面元素，也可访问滑动等操作。
musichaptics|音乐触觉反馈，给听障用户体验音乐增加了哪种信息？|随音乐变化的触觉振动|实时把歌曲变成完整乐谱|只把音量推高|自动为所有歌曲配翻译字幕|Music Haptics 利用轻点、纹理与细腻振动呈现音乐的触觉层次。
taptic|iPhone 的音乐触觉反馈，主要调用哪种部件？|Taptic Engine|扬声器的低频振膜|Face ID 红外组件|耳机线中的震动单元|音乐触觉通过 iPhone 的 Taptic Engine 产生与音乐相配的振动反馈。
vocal|人声快捷指令让用户录下自定义发声，主要用于什么？|触发快捷指令与指定任务|只改变 Siri 的合成音色|只为所有录音自动配乐|只用来建立声纹登录密码|Vocal Shortcuts 让用户把自定义短语或发声与操作关联，为任务提供更多输入方式。
atypical|2024 年公布的识别非典型语音功能，着重改善什么？|对用户不同语音模式的识别|自动把语音翻译成其他语言|只过滤背景音乐|只根据语速自动调大音量|Listen for Atypical Speech 使用设备端机器学习识别用户的语音模式，服务于更多有言语障碍的用户。
motion|车辆运动提示在屏幕边缘显示什么，帮助缓解视觉与运动感觉的冲突？|随车辆运动变化的圆点|屏幕中央持续旋转的箭头|自动把所有 App 改为灰度|遮住全部动态内容的黑色面板|屏幕边缘的动态圆点表达车辆运动变化，尽量不遮挡正在看的内容。
carplay|2024 年公布的 CarPlay 声音识别，特别提到提醒哪些声音？|汽车喇叭与警笛|只提醒联系人来电铃声|只分析车内音乐的节奏|只识别导航语音|CarPlay 的声音识别可向听障驾驶者或乘客提示潜在的喇叭和警笛声。
colorfilters|CarPlay 的颜色滤镜，主要服务哪类界面辨识需求？|色觉差异用户更容易辨认界面|自动降低车内噪声|只提升卫星地图精度|自动改变车外灯光颜色|颜色滤镜改善色觉差异用户的界面可读性，并与粗体文字等视觉选项配合。
visioncaptions|2024 年公布的 visionOS 实时字幕，可以帮助跟上什么？|现场谈话和应用音频中的口语内容|只显示已下载影片的内嵌字幕|只为系统按钮显示标签|只把手势转成提示文字|该更新给现场谈话和应用音频提供系统级实时字幕，具体语言与版本支持另有限制。
hovertyping|悬停键入功能，会怎样帮助看清正在输入的内容？|用更大的文字和偏好字体颜色显示|只放大键盘本身|自动把所有输入改成语音|只在输入结束后朗读全文|Hover Typing 可在文本框输入时放大文字，并采用用户偏好的字体与颜色。
mandarin|2024 年公布的个人声音更新，为哪种语言增加了支持？|普通话|日语|韩语|西班牙语|该年的更新明确列出普通话支持，并允许有困难的用户用较短短语创建个人声音。
virtualpad|辅助触控的虚拟触控板，把屏幕的一小块区域当作什么？|可调整大小的指针控制区域|整块屏幕永久禁止触控|只能控制音量的滑条|一个仅支持手写输入的窗口|Virtual Trackpad 让用户在可调整大小的小区域里控制设备，降低大范围触摸的需要。
fingertap|2024 年公布的切换控制更新，可以借助摄像头识别什么作为开关？|手指轻点手势|只检测头部的左右转动|只识别音量键组合|必须接入专用蓝牙按钮|这一选项使用 iPhone 与 iPad 摄像头识别手指轻点，增加可用的辅助输入方式。
`);
export const curatedV4=questions;

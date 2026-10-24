// Explicit equivalence groups, reviewed alongside the authored wording.
// A family describes a topic; a fact key describes a particular claim.
const equivalences=[
 ['gallery:ipod-wheel',/Click Wheel.*(合|两种)|滚动与.*按键/],
 ['gallery:watch-rings',/(三.*圆环|三.*环).*(记录|对应)|活动能量、锻炼、站立/],
 ['gallery:iphone-three',/初代 iPhone.*三种|iPhone.*三合一/],
 ['gallery:ipad-a4',/第一代 iPad.*芯片|A4.*先装进/],
 ['gallery:imac-floppy',/iMac.*(取消|舍去).*软盘|iMac.*舍去了当时/],
 ['gallery:macbook-envelope',/MacBook Air.*信封|MacBook Air.*什么里面/],
];
export function withFactKeys(q){
 const keys=new Set(q.factKeys||[]);
 for(const [key,pattern] of equivalences)if(pattern.test(q.prompt))keys.add(key);
 if(q.id.startsWith('gallery-')){
  const key={'gallery-ipod-wheel':'gallery:ipod-wheel','gallery-watch-rings':'gallery:watch-rings','gallery-iphone-three':'gallery:iphone-three','gallery-ipad-a4':'gallery:ipad-a4','gallery-imac-floppy':'gallery:imac-floppy','gallery-macbook-envelope':'gallery:macbook-envelope'}[q.id];
  if(key)keys.add(key);
 }
 return keys.size?{...q,factKeys:[...keys]}:q;
}

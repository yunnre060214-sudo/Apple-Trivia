// Each recipe describes the anatomy of its symbol, not a shared bounce.
// Transform/opacity changes stay inside a 24px viewport; no frame timers or DOM copies.
const track = (part, frames, duration=600, delay=0, extra={}) => ({part,frames,duration,delay,...extra});
const move = (part, x, y, duration=540, delay=0) => track(part,[{translate:'0px 0px'},{translate:`${x}px ${y}px`,offset:.45},{translate:'0px 0px'}],duration,delay);
const turn = (part, angle, duration=650, delay=0) => track(part,[{rotate:'0deg'},{rotate:`${angle}deg`}],duration,delay);
const draw = (part, duration=550, delay=0) => track(part,[{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}],duration,delay);
const breathe = (part, scale, duration=620, delay=0) => track(part,[{scale:'1'},{scale:String(scale),offset:.45},{scale:'1'}],duration,delay);
export const ICON_MOTIONS = Object.freeze({
 image:[track('mountains',[{translate:'0px 4px',opacity:0},{translate:'0px 0px',opacity:1}],650),track('sun',[{scale:'.2',opacity:0},{scale:'1',opacity:1}],500,80,{origin:'8px 9px'})],
 link:[move('left',2,-2,680),move('right',-2,2,680,50),draw('join',600,120)],
 arrow:[track('shaft',[{scale:'1 1'},{scale:'.65 1',offset:.25},{scale:'1.12 1',offset:.65},{scale:'1 1'}],520),move('tip',3,0,520)],
 back:[move('tip',-3,0,520),track('shaft',[{scale:'1 1'},{scale:'.7 1',offset:.4},{scale:'1 1'}],520)],
 shuffle:[draw('descending',540),draw('ascending',540,110),move('tips',2,0,480,150)],
 history:[turn('hand',-360,900),track('orbit',[{rotate:'0deg'},{rotate:'-32deg',offset:.35},{rotate:'0deg'}],760)],
 clock:[turn('minute',360,820),track('hour',[{rotate:'0deg'},{rotate:'24deg',offset:.6},{rotate:'0deg'}],900),track('case',[{rotate:'0deg',translate:'0px 0px'},{rotate:'0deg',translate:'0px 0px',offset:.6},{rotate:'7deg',translate:'-1px 0px',offset:.7},{rotate:'-5deg',translate:'1px 0px',offset:.8},{rotate:'2deg',translate:'0px 0px',offset:.9},{rotate:'0deg',translate:'0px 0px'}],940)],
 check:[draw('stroke',480)],
 close:[track('slash',[{rotate:'0deg'},{rotate:'-45deg',offset:.4},{rotate:'0deg'}],480),track('backslash',[{rotate:'0deg'},{rotate:'45deg',offset:.4},{rotate:'0deg'}],480,50)],
 sliders:[move('upper',-5,0,720),move('lower',6,0,720,100)],
 bulb:[track('filament',[{opacity:.65},{opacity:1,offset:.2},{opacity:.35,offset:.35},{opacity:1,offset:.5},{opacity:.65}],850),track('glass',[{fillOpacity:0,fill:'currentColor'},{fillOpacity:.24,fill:'currentColor',offset:.45},{fillOpacity:0,fill:'currentColor'}],850),move('base',0,1,500,180)],
 trophy:[track('cup',[{rotate:'0deg'},{rotate:'-10deg',offset:.25},{rotate:'7deg',offset:.55},{rotate:'0deg'}],850),breathe('handles',1.12,850,70),track('stand',[{scale:'1 1'},{scale:'1.14 1',offset:.5},{scale:'1 1'}],700,100)],
 download:[track('arrow',[{translate:'0px 0px',opacity:1},{translate:'0px 4px',opacity:0,offset:.44},{translate:'0px -5px',opacity:0,offset:.45},{translate:'0px 0px',opacity:1}],760),track('tray',[{scale:'1 1'},{scale:'1.12 .85',offset:.6},{scale:'1 1'}],700,80)],
 share:[track('arrow',[{translate:'0px 0px',opacity:1},{translate:'0px -5px',opacity:0,offset:.48},{translate:'0px 4px',opacity:0,offset:.49},{translate:'0px 0px',opacity:1}],760),track('tray',[{scale:'1 1'},{scale:'.88 1',offset:.38},{scale:'1 1'}],650)],
 copy:[move('back',-2,-2,740),track('front',[{translate:'0px 0px',rotate:'0deg'},{translate:'2px 2px',rotate:'5deg',offset:.45},{translate:'0px 0px',rotate:'0deg'}],740,70)],
 bolt:[track('spark',[{opacity:1},{opacity:.15,offset:.15},{opacity:1,offset:.25},{opacity:.3,offset:.45},{opacity:1,offset:.6},{opacity:1}],500)],
 flag:[track('cloth',[{scale:'1 1',transform:'skewY(0deg)'},{scale:'.78 1',transform:'skewY(-8deg)',offset:.25},{scale:'1.08 1',transform:'skewY(5deg)',offset:.55},{scale:'1 1',transform:'skewY(0deg)'}],780,0,{origin:'6px 4px'}),move('pole',0,-1,560)],
 grid:[['nw',-2,-2],['ne',2,-2],['se',2,2],['sw',-2,2]].map(([part,x,y],i)=>track(part,[{translate:'0px 0px',scale:'1'},{translate:`${x}px ${y}px`,scale:'.7',offset:.4},{translate:'0px 0px',scale:'1'}],520,i*65,{origin:`${x<0?6.5:17.5}px ${y<0?6.5:17.5}px`})),
 moon:[track('crescent',[{rotate:'0deg'},{rotate:'-18deg',offset:.45},{rotate:'0deg'}],850),track('star',[{opacity:0,scale:'.3'},{opacity:1,scale:'1',offset:.45},{opacity:0,scale:'.3'}],850,80,{origin:'18px 5px'})],
 sun:[turn('rays',90,800),breathe('core',.7,800)],
 external:[move('arrow',3,-3,650),track('frame',[{opacity:1},{opacity:.45,offset:.4},{opacity:1}],650)],
 pause:[move('left',-2,0,600),move('right',2,0,600,60)],
 play:[track('triangle',[{scale:'1 1'},{scale:'.7 1',offset:.3},{scale:'1 1'}],600)],
 playback:[move('left',-2,0,600),move('right',2,0,600,60),track('triangle',[{scale:'1 1'},{scale:'.7 1',offset:.3},{scale:'1 1'}],600)],
 apple:[track('leaf',[{rotate:'0deg'},{rotate:'-22deg',offset:.35},{rotate:'8deg',offset:.7},{rotate:'0deg'}],900,0,{origin:'11px 14px'})],
});

import {APPLE_PATH} from './brand.mjs?v=3.7.0';
// Idle motion lives on the outer group; interaction motion owns the inner group.
// Both keep the SVG viewport and the button's hit area fixed.
const part = (name, content, attributes='') => `<g data-icon-idle="${name}"><g data-icon-part="${name}" ${attributes}>${content}</g></g>`;
const path = (d, extra='') => `<path d="${d}" ${extra}/>`;
const paths = {
 arrow:part('shaft',path('M5 12h14'))+part('tip',path('m13 6 6 6-6 6')),
 back:part('shaft',path('M19 12H5'))+part('tip',path('m11 6-6 6 6 6')),
 shuffle:part('descending',path('M3 7h3c5 0 7 10 12 10h3','pathLength="1"'))+part('ascending',path('M3 17h3c2 0 3-2 4-4m3-2c1-2 3-4 5-4h3','pathLength="1"'))+part('tips',path('m17 13 4 4-4 4m0-18 4 4-4 4')),
 history:part('orbit',path('M3 11a9 9 0 1 1 2 7M3 4v7h7'))+part('hand',path('M12 7v6l4 2')),
 clock:part('case','<circle cx="12" cy="12" r="9"/>'+part('hour',path('M12 12l3 2'))+part('minute',path('M12 7v5'))),
 check:part('stroke',path('m5 12 4 4L19 6','pathLength="1"')),
 close:part('slash',path('m6 6 12 12','pathLength="1"'))+part('backslash',path('M6 18 18 6','pathLength="1"')),
 sliders:part('track',path('M4 7h16M4 17h16'))+part('upper','<circle cx="14" cy="7" r="2" fill="var(--bg)"/>')+part('lower','<circle cx="9" cy="17" r="2" fill="var(--bg)"/>'),
 bulb:part('glass',path('M8 14a7 7 0 1 1 8 0c-1 .7-1 2-1 2H9s0-1.3-1-2Z'))+part('filament',path('m10 10 2 2 2-2m-2 2v4','opacity=".65"'))+part('base',path('M9 18h6m-5 3h4')),
 trophy:part('handles',path('M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4'))+part('cup',path('M8 3h8v7a4 4 0 0 1-8 0V3Z'))+part('stand',path('M12 14v6m-4 1h8')),
 download:part('arrow',path('M12 3v12m-5-5 5 5 5-5'))+part('tray',path('M4 16v5h16v-5')),
 share:part('arrow',path('M12 16V3m-5 5 5-5 5 5'))+part('tray',path('M6 11H4v10h16V11h-2')),
 copy:part('back',path('M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3'))+part('front','<rect x="8" y="8" width="12" height="13" rx="3"/>'),
 bolt:part('spark',path('m13 2-9 12h7l-1 8 10-12h-7l1-8Z')),
 flag:part('pole',path('M6 21V4'))+part('cloth',path('M6 4c4-4 8 4 12 0v10c-4 4-8-4-12 0Z')),
 grid:[['nw',3,3],['ne',14,3],['sw',3,14],['se',14,14]].map(([name,x,y])=>part(name,`<rect x="${x}" y="${y}" width="7" height="7" rx="2"/>`)).join(''),
 moon:part('crescent',path('M20.5 13.5A8.8 8.8 0 0 1 10.5 3.5a8.8 8.8 0 1 0 10 10Z'))+part('star',path('M18 3v4m-2-2h4'),'opacity="0"'),
 sun:part('core','<circle cx="12" cy="12" r="4"/>')+part('rays',path('M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4')),
 external:part('frame',path('M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6'))+part('arrow',path('M14 3h7v7m0-7L11 13')),
 pause:part('left',path('M8 5v14'))+part('right',path('M16 5v14')),
 play:part('triangle',path('m8 4 12 8-12 8V4Z')),
 // One persistent SVG prevents playback-state changes from interrupting a press.
 playback:part('left',path('M8 5v14','class="archive-pause-icon"'))+part('right',path('M16 5v14','class="archive-pause-icon"'))+part('triangle',path('m8 4 12 8-12 8V4Z','class="archive-play-icon" fill="currentColor" stroke="none"')),
 apple:'',
};
// The brand path has two subpaths: keep the leaf independent of the fruit.
const appleParts=APPLE_PATH.match(/M[^M]+/g);
paths.apple=appleParts?.length===2?part('fruit',path(appleParts[0]))+part('leaf',path(appleParts[1])):part('fruit',path(APPLE_PATH));
export const icon = (name, cls='') => {
 const key=Object.hasOwn(paths,name)?name:'bulb';
 const attrs=key==='apple'?'viewBox="0 9 20 22" fill="currentColor"':'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
 return `<svg class="icon ${cls}" data-icon="${key}" ${attrs} aria-hidden="true">${paths[key]}</svg>`;
};

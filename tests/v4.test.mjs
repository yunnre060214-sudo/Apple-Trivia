import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {curatedV4} from '../src/curated-v4.mjs';
import {visualQuestions} from '../src/visual.mjs';
import {validateBank,drawQuestions} from '../src/engine.mjs';
import {buildBank} from '../src/bank.mjs';
import {questionMedia} from '../assets/question-media.mjs';
import {createStorage} from '../assets/storage.mjs';
import {qrMatrix} from '../assets/qr.mjs';
import {questionMarkup,homeMarkup,reviewMarkup,esc} from '../assets/views.mjs';
const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8')),bank=buildBank(catalog);
test('pure question views render quick, exam and practice modes without controller globals',()=>{
 const q=visualQuestions[0],questions=[q],base={q,questions,answer:null,locked:false,session:{index:0,flags:[],config:{mode:'quick'}},read:()=>true};
 for(const mode of ['quick','exam','practice']){
  const html=questionMarkup({...base,quick:mode==='quick',session:{...base.session,config:{mode}}});assert.ok(html.includes(q.media.asset));assert.ok(html.includes('data-answer="3"'));assert.ok(html.includes(mode==='practice'?'确认':'查看结果'));
 }
 assert.equal(esc('a\\b"<&'), 'a\\b&quot;&lt;&amp;');
 assert.ok(homeMarkup({saved:null,bank,VERSION:'test'}).includes('看图识物'));
 assert.ok(reviewMarkup({questions,session:{answers:{}},sourceLinks:()=>''}).includes(q.media.asset));
});
test('100 authored claims and 32 illustrated questions have independently usable content',async()=>{
 assert.equal(curatedV4.length,100);assert.equal(new Set(curatedV4.flatMap(q=>q.factKeys)).size,100);
 assert.equal(visualQuestions.length,32);validateBank([...curatedV4,...visualQuestions]);
 for(const q of visualQuestions){await access(new URL('../assets/visual/'+q.media.asset,import.meta.url));assert.ok(q.media.alt.length>10);assert.ok(q.media.fallback.includes(q.media.alt));const svg=await readFile(new URL('../assets/visual/'+q.media.asset,import.meta.url),'utf8');assert.doesNotMatch(svg,/<script|<image|https?:\/\/(?!www\.w3\.org)/);}
});
test('default rounds reserve a visual and no more than one timeline while the visual pool is fresh',()=>{
 for(let seed=0;seed<100;seed++){
  const qs=drawQuestions(bank,{count:5,mode:'quick',casual:true},seed);
  assert.equal(qs.filter(q=>q.kind==='visual').length,1);assert.equal(qs.filter(q=>q.kind==='timeline').length,1);assert.equal(qs.filter(q=>q.kind==='trivia').length,3);
  const facts=qs.flatMap(q=>q.factKeys||[]);assert.equal(facts.length,new Set(facts).size);
 }
 assert.ok(drawQuestions(bank,{topic:'visual',count:5,mode:'quick',casual:true},22).every(q=>q.kind==='visual'));
});
test('known alternative phrasings share explicit fact keys, recent alternatives yield to new facts',()=>{
 const q=bank.find(q=>q.id==='gallery-ipod-wheel'),v=bank.find(q=>q.id==='visual-ipod-wheel');assert.ok(q.factKeys.some(f=>v.factKeys.includes(f)));
 const base={...curatedV4[0],kind:'trivia',family:undefined},pool=[{...base,id:'seen',factKeys:['same']},{...base,id:'reworded',factKeys:['same']},{...base,id:'new',factKeys:['new']}];
 for(let seed=0;seed<20;seed++)assert.equal(drawQuestions(pool,{count:1,mode:'quick'},seed,['seen'])[0].id,'new');
});
test('media markup escapes attributes and provides a readable fallback without source loading',()=>{
 const q=structuredClone(visualQuestions[0]);q.media.alt='" onload="test<';
 const markup=questionMedia(q);assert.match(markup,/&quot; onload=&quot;test&lt;/);assert.ok(markup.includes('media-fallback'));assert.equal(questionMedia({}), '');
});
test('unavailable and corrupt local storage preserve playability and emit one useful warning',()=>{
 let warnings=0;const api=createStorage({getItem:()=>'{broken',setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('blocked');}},{onError:()=>warnings++});
 assert.equal(api.read('session','fallback'),'fallback');assert.equal(api.write('session',{}),false);api.write('seen',[]);api.remove('session');assert.equal(warnings,1);
});
test('QR encoder retains finder patterns, rejects oversized links and renders both ordinary and challenge URLs',()=>{
 for(const text of ['https://example.test/', 'https://example.test/#challenge='+ 'a'.repeat(500)]){
  const qr=qrMatrix(text);assert.ok(qr.length>=21);assert.equal(qr.length%4,1);assert.ok(qr.every(row=>row.length===qr.length));
  assert.ok(qr[0].slice(0,7).every(Boolean));assert.equal(qr[1][1],false);assert.equal(qr[3][3],true);
 }
 assert.equal(qrMatrix('x'.repeat(1201)),null);
});

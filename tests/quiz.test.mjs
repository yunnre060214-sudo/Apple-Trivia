import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBank } from '../src/bank.mjs';
import { VERSION, CATEGORIES, LEVELS, drawQuestions, filterBank, createSession, hydrateSession, grade, updateWrongBook, validateBank, shuffle, seeded } from '../src/engine.mjs';
const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8'));
const bank=buildBank(catalog);
const config={difficulty:'mixed',categories:Object.keys(CATEGORIES),count:100,mode:'exam',secondsPerQuestion:0};

test('all original questions have distinct stems, four unique choices, explanations and cited sources',()=>{
  const summary=validateBank(bank);
  assert.ok(summary.total>=1000);
  for(const [category,n] of Object.entries(summary.categories))assert.ok(n>=10,`${category}: ${n}`);
  for(const [level,n] of Object.entries(summary.levels))assert.ok(n>=25,`${level}: ${n}`);
});
test('sampling is reproducible, nonrepeating, shuffled and does not mutate the bank',()=>{
  const before=JSON.stringify(bank);
  const a=drawQuestions(bank,config,1234), b=drawQuestions(bank,config,1234), c=drawQuestions(bank,config,5678);
  assert.equal(a.length,100);assert.equal(new Set(a.map(q=>q.id)).size,100);
  assert.deepEqual(a,b);assert.notDeepEqual(a.map(q=>q.id),c.map(q=>q.id));
  assert.ok(a.some(q=>q.options.join('|')!==bank.find(o=>o.id===q.id).options.join('|')));
  assert.equal(JSON.stringify(bank),before);
});
test('each product line, difficulty and combined filter is respected, including small pools',()=>{
  for(const category of Object.keys(CATEGORIES))for(const difficulty of ['mixed',...Object.keys(LEVELS)]){
    const cfg={...config,categories:[category],difficulty,count:500};
    const pool=filterBank(bank,cfg),draw=drawQuestions(bank,cfg,42);
    assert.equal(draw.length,Math.min(pool.length,500));
    assert.ok(draw.every(q=>q.category===category&&(difficulty==='mixed'||q.difficulty===difficulty)));
  }
  assert.deepEqual(drawQuestions(bank,{...config,categories:[]},42),[]);
});
test('balanced sampling includes every populated category in a 100-question comprehensive paper',()=>{
  const draw=drawQuestions(bank,config,99);
  assert.deepEqual([...new Set(draw.map(q=>q.category))].sort(),Object.keys(CATEGORIES).sort());
});
test('recently unseen questions are preferred and seen questions only backfill exhausted pools',()=>{
  const pool=bank.slice(0,120);const seen=pool.slice(0,90).map(q=>q.id);
  const small=drawQuestions(pool,{...config,count:20},12,seen);
  assert.ok(small.every(q=>!seen.includes(q.id)));
  const large=drawQuestions(pool,{...config,count:50},12,seen);
  assert.equal(large.filter(q=>!seen.includes(q.id)).length,30);
});
test('answer keys remain correct after shuffling all choices',()=>{
  for(const q of drawQuestions(bank,{...config,count:bank.length},18))assert.equal(q.options.filter(o=>o===q.answer).length,1);
});
test('grading covers correct, incorrect, unanswered, weighted scores and streak breaks',()=>{
  const qs=['easy','medium','hard','expert'].map((difficulty,i)=>({id:String(i),category:i<2?'iphone':'mac',difficulty,answer:'yes'}));
  const report=grade(qs,{'0':'yes','1':'no','2':'yes'},1000,61000);
  assert.equal(report.correct,2);assert.equal(report.wrong,1);assert.equal(report.unanswered,1);
  assert.equal(report.score,50);assert.equal(report.weightedScore,40);assert.equal(report.duration,60);assert.equal(report.bestStreak,1);
  assert.deepEqual(report.categories.iphone,{correct:1,total:2});
  assert.equal(grade(qs,Object.fromEntries(qs.map(q=>[q.id,q.answer])),1000,1000).score,100);
  assert.equal(grade(qs,{},1000,0).duration,0);
});
test('resume preserves chosen option order, answers, flags and total-paper deadline',()=>{
  const qs=drawQuestions(bank,{...config,count:10},14);
  const s=createSession(qs,{...config,count:10,secondsPerQuestion:30},14,1000);
  s.answers[qs[0].id]=qs[0].answer;s.flags=[qs[1].id];s.index=4;
  for (const version of ['1.0.0', '2.2.3', '3.0.0', '3.0.1', '3.0.2', VERSION]) {
    const restored=hydrateSession(JSON.parse(JSON.stringify({...s,version})),bank);
    assert.equal(restored.deadline,301000);assert.equal(restored.index,4);assert.deepEqual(restored.answers,s.answers);
    assert.deepEqual(restored.hydratedQuestions.map(q=>q.options),qs.map(q=>q.options));
    assert.deepEqual(restored.flags,s.flags);
  }
});
test('practice sessions are untimed and a correct retry clears a previous mistake',()=>{
  const qs=drawQuestions(bank,{...config,count:5},7);
  assert.equal(createSession(qs,{...config,mode:'practice',secondsPerQuestion:30},7,100).deadline,null);
  const report=grade(qs,{[qs[0].id]:qs[0].answer},100,200);
  const result=updateWrongBook([qs[0].id,'unrelated'],report);
  assert.ok(!result.includes(qs[0].id));assert.ok(result.includes(qs[1].id));assert.ok(result.includes('unrelated'));
});
test('bad or incompatible saved state cannot inject questions or altered options into the quiz',()=>{
  const qs=drawQuestions(bank,{...config,count:5},7);const s=createSession(qs,config,7,100);
  assert.equal(hydrateSession({...s,version:'old'},bank),null);
  assert.equal(hydrateSession({...s,questions:[{id:'missing',options:[]}]},bank),null);
  const tampered=structuredClone(s);tampered.questions[0].options[0]='injected';assert.equal(hydrateSession(tampered,bank),null);
  const duplicated=structuredClone(s);duplicated.questions[1]=duplicated.questions[0];assert.equal(hydrateSession(duplicated,bank),null);
  s.index=999;s.flags=['missing'];s.answers={[qs[0].id]:'injected'};
  const clean=hydrateSession(s,bank);assert.equal(clean.index,4);assert.deepEqual(clean.answers,{});assert.deepEqual(clean.flags,[]);
});
test('a wrong-book retry never draws outside the requested IDs',()=>{
  const ids=bank.slice(20,31).map(q=>q.id);const qs=drawQuestions(bank,{...config,ids,count:100},2);
  assert.equal(qs.length,11);assert.ok(qs.every(q=>ids.includes(q.id)));
});
test('malformed JSON session rows and oversized saves recover without throwing during home loading',()=>{
  const qs=drawQuestions(bank,{...config,count:5},7),s=createSession(qs,config,7,100);
  for(const row of [null,1,'bad',[],{},false,{id:qs[0].id,options:null}]) {
    assert.equal(hydrateSession({...s,questions:[row]},bank),null);
  }
  assert.equal(hydrateSession({...s,questions:Array(501).fill(s.questions[0])},bank),null);
  assert.equal(hydrateSession({...s,startedAt:-1},bank),null);
  for(const answers of [null,[],true,5,'bad'])assert.deepEqual(hydrateSession({...s,answers},bank).answers,{});
  assert.equal(hydrateSession({...s,version:'3.3.1'},bank).hydratedQuestions.length,5);
});
test('restored practice and quick rounds cannot inherit a corrupt exam deadline',()=>{
  const qs=drawQuestions(bank,{...config,count:5},7),s=createSession(qs,{...config,secondsPerQuestion:30},7,100);
  for(const mode of ['practice','quick'])assert.equal(hydrateSession({...s,config:{...s.config,mode}},bank).deadline,null);
  assert.equal(hydrateSession(s,bank).deadline,150100);
});
test('seeded Fisher-Yates reaches all answer positions without sorting bias',()=>{
  const positions=new Set();
  for(let i=0;i<40;i++)positions.add(shuffle(['a','b','c','d'],seeded(i)).indexOf('a'));
  assert.equal(positions.size,4);
});
test('important model boundaries and camera parsing regressions stay correct',()=>{
  const model=name=>catalog.find(p=>p.model===name);
  assert.equal(model('iPhone 16 Pro').facts.screen,6.3);
  assert.equal(model('iPhone 6s').facts.camera,12);
  assert.equal(model('iPhone SE (3rd generation)').facts.connector,'Lightning');
  assert.equal(model('iPhone 16').facts.connector,'USB-C');
  assert.equal(model('iPad mini (A17 Pro)').facts.gpu,5);
  assert.equal(model('iPad Air 11-inch (M2)').facts.gpu,9);
  assert.equal(model('iPad Pro 11-inch (M4)').facts.display,'双层串联 OLED');
  assert.ok(model('iPad Pro 11-inch (M4)').facts.pencil.includes('Pro'));
  for(const p of catalog)if(p.facts.camera)assert.ok([.3,1.2,2,3,5,8,12,48].includes(p.facts.camera),p.model);
  assert.ok(bank.filter(q=>q.tag==='双条件选型').every(q=>!q.prompt.includes('使用LCD显示屏')));
});

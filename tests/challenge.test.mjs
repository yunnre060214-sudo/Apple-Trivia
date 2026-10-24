import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildBank} from '../src/bank.mjs';
import {createSession,hydrateSession,drawQuestions,VERSION} from '../src/engine.mjs';
import {createChallenge,readChallenge,challengeURL,challengeFromHash} from '../src/challenge.mjs';
const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8')),bank=buildBank(catalog);
const pack=value=>btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
test('1–500 question links reproduce the exact paper and option order on another bank order',()=>{
 for(const count of [1,5,32,100,500]){
  const qs=drawQuestions(bank,{count,mode:'exam'},count),token=createChallenge(qs),decoded=readChallenge(token,[...bank].reverse());
  assert.equal(decoded.ok,true);assert.deepEqual(decoded.questions,qs);
  const url=challengeURL(qs,'https://example.test/Apple-Trivia/?v=old#main');
  assert.equal(new URL(url).search,'');assert.equal(challengeFromHash(new URL(url).hash),token);
  assert.equal(challengeFromHash('#main'),null);assert.ok(token.length<64000);
 }
});
test('links contain identities and permutation indexes without embedding answers or score claims',()=>{
 const qs=bank.filter(q=>q.kind==='visual').slice(0,5),value=JSON.parse(atob(createChallenge(qs).replace(/-/g,'+').replace(/_/g,'/')));
 assert.equal(value.length,3);assert.equal(typeof value[1],'string');
 assert.deepEqual(value[2].map(r=>r[0]),qs.map(q=>q.id));
 assert.ok(value[2].every(row=>row.length===2&&/^[0-3]{4}$/.test(row[1])));
 assert.ok(!JSON.stringify(value).includes(qs[0].answer));
});
test('malformed, duplicate, missing, altered and future papers fail safely without throwing',()=>{
 const qs=bank.slice(0,5),token=createChallenge(qs),value=JSON.parse(atob(token.replace(/-/g,'+').replace(/_/g,'/')));
 for(const input of ['',null,'%%%', 'x'.repeat(64001),pack({}),pack([1,'abc',[]]),pack([1,'abc',null])])assert.equal(readChallenge(input,bank).ok,false);
 assert.equal(readChallenge(pack([99,...value.slice(1)]),bank).reason,'version');
 const duplicate=structuredClone(value);duplicate[2][1]=duplicate[2][0];assert.equal(readChallenge(pack(duplicate),bank).ok,false);
 const choices=structuredClone(value);choices[2][0][1]='0000';assert.equal(readChallenge(pack(choices),bank).ok,false);
 assert.equal(readChallenge(token,bank.filter(q=>q.id!==qs[0].id)).reason,'expired');
 const edited=bank.map(q=>q.id===qs[0].id?{...q,prompt:q.prompt+' changed'}:q);assert.equal(readChallenge(token,edited).reason,'expired');
 const editedAnswer=bank.map(q=>q.id===qs[0].id?{...q,answer:q.options.find(o=>o!==q.answer)}:q);assert.equal(readChallenge(token,editedAnswer).reason,'expired');
 // Adding unrelated facts in a later release leaves an unchanged paper usable.
 assert.equal(readChallenge(token,[...bank,{...bank[0],id:'new-question'}]).ok,true);
 const picture=bank.find(q=>q.media),pictureToken=createChallenge([picture]);
 assert.equal(readChallenge(pictureToken,[{...picture,media:{...picture.media,artHash:'changed'}}]).reason,'expired');
});
test('a challenge resumes with its fixed answers, ordering and untimed final reveal',()=>{
 const qs=drawQuestions(bank,{count:5,mode:'quick',casual:true},4),token=createChallenge(qs),s=createSession(qs,{mode:'exam',challenge:token,count:5},0,1000);
 s.answers[qs[0].id]=qs[0].options[1];s.index=2;
 const h=hydrateSession(JSON.parse(JSON.stringify(s)),bank);assert.equal(h.config.challenge,token);assert.deepEqual(h.questions,s.questions);assert.deepEqual(h.answers,s.answers);assert.equal(h.deadline,null);
 for(const version of ['3.5.0','3.6.0','3.7.0',VERSION])assert.ok(hydrateSession({...s,version},bank));
});

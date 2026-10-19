import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questionRouteChange,clearQuestionUrl,followsInPlace,quizShortcut} from '../assets/navigation.mjs';

const url=hash=>`https://example.com/Apple-Trivia/?v=3.4.0${hash}`;
test('document anchors preserve the active round while gallery back/forward changes its route',()=>{
  for(const before of ['', '#q=gallery-mac-memory'])assert.equal(questionRouteChange(url(before),url('#main')),null);
  assert.equal(questionRouteChange(url('#main'),url('')),null);
  assert.deepEqual(questionRouteChange(url(''),url('#q=gallery-macbook-envelope')),{id:'gallery-macbook-envelope'});
  assert.deepEqual(questionRouteChange(url('#q=gallery-mac-memory'),url('')),{id:null});
  assert.deepEqual(questionRouteChange(url(''),url('#q=%E0%A4%A')),{id:null});
});
test('starting a normal round removes only the stale question route, preserving path and query',()=>{
  const calls=[],history={replaceState:(...args)=>calls.push(args)};
  const location={pathname:'/Apple-Trivia/',search:'?v=3.4.0',hash:'#q=gallery-mac-memory'};
  clearQuestionUrl({location,history});assert.deepEqual(calls,[[null,'','/Apple-Trivia/?v=3.4.0']]);
  for(const hash of ['', '#main'])clearQuestionUrl({location:{...location,hash},history});
  assert.equal(calls.length,1);
});
test('gallery links preserve new-tab, download and modified-click browser behavior',()=>{
  const event={button:0},link={target:'',hasAttribute:()=>false};
  assert.equal(followsInPlace(event,link),true);
  for(const modifier of ['altKey','ctrlKey','metaKey','shiftKey','defaultPrevented'])assert.equal(followsInPlace({...event,[modifier]:true},link),false);
  assert.equal(followsInPlace({button:1},link),false);
  assert.equal(followsInPlace(event,{...link,target:'_blank'}),false);
  assert.equal(followsInPlace(event,{...link,hasAttribute:()=>true}),false);
});
test('quiz shortcuts respect browser modifiers, editable fields and native button activation',()=>{
  const prompt={matches:()=>false};
  assert.deepEqual(quizShortcut({key:'3'},prompt),{action:'answer',index:2});
  assert.deepEqual(quizShortcut({key:'Enter'},prompt),{action:'advance'});
  for(const modifier of ['altKey','ctrlKey','metaKey','shiftKey','repeat','defaultPrevented'])assert.equal(quizShortcut({key:'1',[modifier]:true},prompt),null);
  assert.equal(quizShortcut({key:'2'},{matches:()=>true}),null);
  assert.equal(quizShortcut({key:'1'},{...prompt,isContentEditable:true}),null);
  assert.equal(quizShortcut({key:'Enter'},{matches:s=>s==='button,a,summary'}),null);
  assert.equal(quizShortcut({key:'Escape'},prompt),null);
});

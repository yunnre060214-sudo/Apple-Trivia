import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {opticalOffset,questionFromHash} from '../assets/home.mjs';
import {devices} from '../assets/gallery-data.mjs';
import {buildBank} from '../src/bank.mjs';
import {drawQuestions} from '../src/engine.mjs';

test('every exhibit deep link resolves to exactly its own playable question in the real bank',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8'));
  const bank=buildBank(catalog);
  for(const device of devices) {
    const id=questionFromHash(`#q=${device.question.id}`);
    const round=drawQuestions(bank,{count:1,mode:'practice',ids:[id]},42,[]);
    assert.equal(round.length,1);assert.equal(round[0].id,id);assert.equal(round[0].options.length,4);
    assert.ok(round[0].options.includes(round[0].answer));assert.ok(round[0].sources.length);
    assert.equal(device.iso.slice(0,4),device.year);
  }
});
test('optical alignment uses visible glyph bearings rather than equal text boxes',()=>{
  assert.equal(opticalOffset({actualBoundingBoxLeft:-4.25},{actualBoundingBoxLeft:-.75}),-3.5);
  assert.equal(opticalOffset({actualBoundingBoxLeft:-1},{actualBoundingBoxLeft:-3}),2);
});
test('malformed or unrelated URL fragments cannot break initial loading',()=>{
  for(const hash of ['','#main','#q=%E0%A4%A','#q=unknown','#q=<script>'])assert.equal(questionFromHash(hash),null);
  assert.equal(questionFromHash('#q=gallery-macbook-envelope'),'gallery-macbook-envelope');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSharePreview} from '../assets/share.mjs';

function fixture() {
  const jobs=[],created=[],revoked=[],ready=[],failed=[];
  const manager=createSharePreview({
    render:report=>new Promise((resolve,reject)=>jobs.push({report,resolve,reject})),
    createUrl:blob=>{created.push(blob);return `blob:${created.length}`;},
    revokeUrl:url=>revoked.push(url),
  });
  const show=report=>manager.show(report,'title',{ready:value=>ready.push(value),fail:error=>failed.push(error.message)});
  return {manager,jobs,created,revoked,ready,failed,show};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('closing a pending share preview prevents late callbacks and unused blob URLs',async()=>{
  const f=fixture(),pending=f.show({});await flush();f.manager.clear();
  f.jobs[0].resolve('image');await pending;
  assert.equal(f.manager.blob,null);assert.deepEqual(f.created,[]);assert.deepEqual(f.ready,[]);
});
test('reopening the same report reuses its renderer and only updates the newest preview',async()=>{
  const f=fixture(),report={},first=f.show(report),second=f.show(report);await flush();
  assert.equal(f.jobs.length,1);f.jobs[0].resolve('image');await Promise.all([first,second]);
  assert.equal(f.ready.length,1);assert.equal(f.manager.blob,'image');assert.deepEqual(f.created,['image']);
  f.manager.clear();assert.deepEqual(f.revoked,['blob:1']);
  await f.show(report);assert.equal(f.jobs.length,1);assert.deepEqual(f.created,['image','image']);
  f.manager.clear();assert.deepEqual(f.revoked,['blob:1','blob:2']);
});
test('an old failed renderer cannot replace a newer successful preview, and failures can retry',async()=>{
  const f=fixture(),a={},b={},old=f.show(a),current=f.show(b);await flush();
  f.jobs[1].resolve('new');await current;f.jobs[0].reject(Error('stale'));await old;
  assert.deepEqual(f.failed,[]);assert.equal(f.manager.blob,'new');
  const retry=f.show(a);await flush();assert.equal(f.jobs.length,3);
  f.jobs[2].reject(Error('encoding failed'));await retry;assert.deepEqual(f.failed,['encoding failed']);
  const again=f.show(a);await flush();f.jobs[3].resolve('retry');await again;assert.equal(f.manager.blob,'retry');f.manager.clear();
});

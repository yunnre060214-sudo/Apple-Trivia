import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSharePreview,shareTrailLayout} from '../assets/share.mjs';

function fixture() {
  const jobs=[],created=[],revoked=[],ready=[],failed=[];
  const manager=createSharePreview({
    render:(report,title,options)=>new Promise((resolve,reject)=>jobs.push({report,title,options,resolve,reject})),
    createUrl:blob=>{created.push(blob);return `blob:${created.length}`;},
    revokeUrl:url=>revoked.push(url),
  });
  const show=(report,theme='light',title='title')=>manager.show(report,title,{theme,ready:value=>ready.push(value),fail:error=>failed.push(error.message)});
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

test('rapid skin changes cannot publish an older image and each completed skin is cached separately',async()=>{
  const f=fixture(),report={};
  const light=f.show(report,'light'),dark=f.show(report,'dark');await flush();
  assert.deepEqual(f.jobs.map(job=>job.options.theme),['light','dark']);
  f.jobs[1].resolve('dark-image');await dark;
  f.jobs[0].resolve('light-image');await light;
  assert.equal(f.manager.blob,'dark-image');assert.deepEqual(f.created,['dark-image']);
  await f.show(report,'light');assert.equal(f.manager.blob,'light-image');
  await f.show(report,'dark');assert.equal(f.jobs.length,2);assert.equal(f.manager.blob,'dark-image');
  const renamed=f.show(report,'dark','another title');await flush();assert.equal(f.jobs.length,3);
  f.jobs[2].resolve('renamed');await renamed;assert.equal(f.manager.blob,'renamed');f.manager.clear();
});

test('a stale failed skin can retry without invalidating a successfully cached skin',async()=>{
  const f=fixture(),report={},light=f.show(report),dark=f.show(report,'dark');await flush();
  f.jobs[0].reject(Error('old light'));await light;assert.deepEqual(f.failed,[]);
  f.jobs[1].resolve('dark');await dark;
  const retry=f.show(report);await flush();f.jobs[2].resolve('light');await retry;
  await f.show(report,'dark');assert.equal(f.jobs.length,3);assert.equal(f.manager.blob,'dark');f.manager.clear();
});

test('the complete 1–500 question trail stays inside the printable matrix without hiding rows',()=>{
  for(let total=1;total<=500;total++){
    const layout=shareTrailLayout(total);
    assert.ok(layout.columns*layout.rows>=total);
    assert.ok((layout.rows-1)*layout.stepY+layout.radius*2<=176);
    assert.ok((layout.columns-1)*layout.stepX+layout.radius*2<=840);
    assert.ok(layout.radius>=4);
  }
});

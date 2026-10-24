import { readFile, mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { buildBank, REVIEWED_AT } from '../src/bank.mjs';
import { VERSION, validateBank,hash } from '../src/engine.mjs';
import { createHelloController } from '../assets/hello.mjs';
import { verifyRelease } from './verify-release.mjs';
import {stampDirectory,stampRelease} from './release.mjs';
import {buildVisuals} from './build-visuals.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const packageInfo=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(packageInfo.version!==VERSION)throw Error('Package and engine release versions differ');
const catalog=JSON.parse(await readFile(resolve(root,'src/catalog.json'),'utf8'));
const questions=buildBank(catalog);
await buildVisuals(root);
for(const question of questions)if(question.media)question.media={...question.media,artHash:hash(await readFile(resolve(root,'assets/visual',question.media.asset),'utf8')).toString(36)};
const statistics={...validateBank(questions), kinds:Object.fromEntries(['trivia','visual','timeline','classic'].map(k=>[k,questions.filter(q=>(q.kind||'classic')===k).length])), content:{catalogProducts:catalog.length,newAuthoredFacts:100,visualStudies:32,generatedTimelineRelations:questions.filter(q=>q.id.startsWith('timeline-')).length}};
if(questions.length<=4000)throw new Error('The release must contain more than 4,000 distinct questions.');
const destination=resolve(root,'dist');
await rm(destination,{recursive:true,force:true});
await mkdir(resolve(destination,'src'),{recursive:true});
const helloStyles=await readFile(resolve(root,'assets/hello.css'),'utf8');
const helloRuntime=`const controller=(${createHelloController.toString()})({document});window.appleTriviaHello=controller;controller.play();window.addEventListener('pageshow',event=>{if(event.persisted)controller.play({restart:true});});`;
const html=(await readFile(resolve(root,'index.html'),'utf8'))
  .replace('<!-- hello:styles -->',`<style id="hello-styles">${helloStyles}</style>`)
  .replace('<!-- hello:runtime -->',`<script>(()=>{${helloRuntime}})();</script>`);
await writeFile(resolve(destination,'index.html'),stampRelease(html));
await cp(resolve(root,'assets'),resolve(destination,'assets'),{recursive:true});
await cp(resolve(root,'src/engine.mjs'),resolve(destination,'src/engine.mjs'));
await cp(resolve(root,'src/challenge.mjs'),resolve(destination,'src/challenge.mjs'));
await stampDirectory(resolve(destination,'assets'));
await stampDirectory(resolve(destination,'src'));
await writeFile(resolve(destination,'questions.json'),JSON.stringify({version:VERSION,reviewedAt:REVIEWED_AT,statistics,questions}));
await writeFile(resolve(destination,'.nojekyll'),'');
await writeFile(resolve(destination,'version.json'),JSON.stringify({version:VERSION,questions:questions.length,reviewedAt:REVIEWED_AT})+'\n');
await verifyRelease(destination,VERSION);
console.log(JSON.stringify({version:VERSION,reviewedAt:REVIEWED_AT,...statistics},null,2));


import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyRelease} from '../scripts/verify-release.mjs';
import {execFileSync} from 'node:child_process';

test('version updates preserve previous progress compatibility and synchronize release identities',async()=>{
  const root=await mkdtemp(join(tmpdir(),'apple-version-'));
  try{
    await mkdir(join(root,'scripts'));await mkdir(join(root,'src'));
    await writeFile(join(root,'scripts/set-version.mjs'),await readFile(new URL('../scripts/set-version.mjs',import.meta.url),'utf8'));
    await writeFile(join(root,'src/engine.mjs'),"export const VERSION = '4.0.0';\nconst compatible=['3.7.0', VERSION].includes(saved.version);");
    await writeFile(join(root,'package.json'),JSON.stringify({version:'4.0.0'}));
    await writeFile(join(root,'package-lock.json'),JSON.stringify({version:'4.0.0',packages:{'':{version:'4.0.0'}}}));
    await writeFile(join(root,'README.md'),'当前版本 **4.0.0**，地址 ?v=4.0.0');
    execFileSync(process.execPath,[join(root,'scripts/set-version.mjs'),'4.0.1']);
    const source=await readFile(join(root,'src/engine.mjs'),'utf8');assert.match(source,/VERSION = '4\.0\.1'/);assert.match(source,/'4\.0\.0', VERSION/);
    const lock=JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));assert.equal(lock.version,'4.0.1');assert.equal(lock.packages[''].version,'4.0.1');
    assert.match(await readFile(join(root,'README.md'),'utf8'),/当前版本 \*\*4\.0\.1\*\*/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('release validation follows nested module imports and rejects stale or missing published assets',async()=>{
  const root=await mkdtemp(join(tmpdir(),'apple-release-'));
  try {
    await mkdir(join(root,'assets'));
    await writeFile(join(root,'index.html'),'<script src="./assets/app.mjs?v=3.4.0"></script>');
    await writeFile(join(root,'assets/app.mjs'),"export {value} from './nested.mjs?v=3.4.0';");
    await writeFile(join(root,'assets/nested.mjs'),'export const value=1;');
    await writeFile(join(root,'version.json'),JSON.stringify({version:'3.4.0',questions:1}));
    await writeFile(join(root,'questions.json'),JSON.stringify({version:'3.4.0',questions:[{}]}));
    assert.equal(await verifyRelease(root,'3.4.0'),3);
    await writeFile(join(root,'assets/app.mjs'),"export {value} from './nested.mjs?v=3.3.1';");
    await assert.rejects(verifyRelease(root,'3.4.0'),/Stale release reference/);
    await writeFile(join(root,'assets/app.mjs'),"export {value} from './missing.mjs?v=3.4.0';");
    await assert.rejects(verifyRelease(root,'3.4.0'),/ENOENT/);
    await writeFile(join(root,'assets/app.mjs'),'export const value=1;');
    await writeFile(join(root,'version.json'),JSON.stringify({version:'3.3.1',questions:1}));
    await assert.rejects(verifyRelease(root,'3.4.0'),/metadata/);
  } finally {await rm(root,{recursive:true,force:true});}
});

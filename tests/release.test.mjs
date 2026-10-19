import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyRelease} from '../scripts/verify-release.mjs';

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

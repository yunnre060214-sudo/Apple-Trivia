import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

// Follow the actual published HTML/module graph, so a missing copy or a stale
// cache parameter fails the build before Pages receives an unusable release.
export async function verifyRelease(directory,version) {
  const pending=['index.html'],visited=new Set();
  while(pending.length) {
    const path=pending.pop();if(visited.has(path))continue;visited.add(path);
    const filename=resolve(directory,path),info=await stat(filename);
    if(!info.isFile()||!info.size)throw Error(`Missing release asset: ${path}`);
    if(!/\.(html|mjs|css)$/.test(path))continue;
    const source=await readFile(filename,'utf8');
    const references=path.endsWith('.html')?[...source.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]):path.endsWith('.mjs')?[...source.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)].map(m=>m[1]):[...source.matchAll(/url\(\s*['"]?(\.[^)'"]+)['"]?\s*\)/g)].map(m=>m[1]);
    for(const reference of references) {
      if(reference==='./')continue;
      const url=new URL(reference,`https://release.test/${path}`);
      if((path.endsWith('.mjs')||url.searchParams.has('v'))&&url.searchParams.get('v')!==version)throw Error(`Stale release reference: ${path} -> ${reference}`);
      pending.push(url.pathname.slice(1));
    }
  }
  const manifest=JSON.parse(await readFile(resolve(directory,'version.json'),'utf8'));
  const bank=JSON.parse(await readFile(resolve(directory,'questions.json'),'utf8'));
  if(manifest.version!==version||bank.version!==version||manifest.questions!==bank.questions.length)throw Error('Release metadata does not match the question bank');
  return visited.size;
}

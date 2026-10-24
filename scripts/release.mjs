import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const releaseVersion=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version;
export function stampRelease(text,version=releaseVersion) {
  return text.replace(/\?v=(?:\d+\.\d+\.\d+|__VERSION__)/g,`?v=${version}`)
    .replace(/(\bfrom\s*['"])(\.[^'"?]+\.mjs)(['"])/g,`$1$2?v=${version}$3`);
}
export async function stampDirectory(directory,version=releaseVersion) {
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const file=resolve(directory,entry.name);
    if(entry.isDirectory())await stampDirectory(file,version);
    else if(/\.(?:mjs|css|html|svg)$/.test(entry.name)) {
      const content=await readFile(file,'utf8'),stamped=stampRelease(content,version);
      if(stamped!==content)await writeFile(file,stamped);
    }
  }
}

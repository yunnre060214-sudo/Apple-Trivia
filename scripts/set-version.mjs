import {readFile,writeFile} from 'node:fs/promises';
const next=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(next||''))throw Error('Usage: npm run version:set -- 4.0.1');
const root=new URL('../',import.meta.url),packageFile=new URL('package.json',root),engine=new URL('src/engine.mjs',root);
const info=JSON.parse(await readFile(packageFile,'utf8'));info.version=next;
await writeFile(packageFile,JSON.stringify(info,null,2)+'\n');
let engineSource=await readFile(engine,'utf8');
const previous=engineSource.match(/export const VERSION = '([^']+)';/)[1];
if(previous!==next&&!engineSource.includes(`'${previous}',`))engineSource=engineSource.replace(', VERSION].includes(saved.version)',`, '${previous}', VERSION].includes(saved.version)`);
await writeFile(engine,engineSource.replace(/export const VERSION = '[^']+';/,`export const VERSION = '${next}';`));
const readme=new URL('README.md',root);
await writeFile(readme,(await readFile(readme,'utf8')).replace(/当前版本 \*\*[\d.]+\*\*/,`当前版本 **${next}**`).replace(/\?v=\d+\.\d+\.\d+/g,`?v=${next}`));
try{const file=new URL('package-lock.json',root),lock=JSON.parse(await readFile(file,'utf8'));lock.version=next;if(lock.packages?.[''])lock.packages[''].version=next;await writeFile(file,JSON.stringify(lock,null,2)+'\n');}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(`Version set to ${next}; build stamps HTML and module references automatically.`);

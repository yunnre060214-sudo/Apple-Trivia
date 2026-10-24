import {hash} from './engine.mjs';

export const CHALLENGE_SCHEMA=1;
export const CHALLENGE_LIMIT=500;
const MAX_TOKEN=64000;
const ordered=q=>[...q.options].sort();
// A content fingerprint detects a changed/removed question across releases.
// It is an integrity check, not an authenticated score or a competition server.
const fingerprint=questions=>hash(JSON.stringify(questions.map(q=>[q.id,q.prompt,ordered(q),q.answer,q.media?[q.media.asset,q.media.alt,q.media.artHash??null]:null]))).toString(36);
const encode=value=>btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(token) {
  if(typeof token!=='string'||!token.length||token.length>MAX_TOKEN||!/^[\w-]+$/.test(token))throw Error('invalid');
  return JSON.parse(atob(token.replace(/-/g,'+').replace(/_/g,'/')));
}
export function createChallenge(questions) {
  if(!Array.isArray(questions)||!questions.length||questions.length>CHALLENGE_LIMIT)throw Error('Invalid challenge size');
  const ids=new Set();
  const rows=questions.map(q=>{
    if(!/^[A-Za-z0-9-]+$/.test(q.id)||ids.has(q.id)||q.options.length!==4||new Set(q.options).size!==4)throw Error('Invalid challenge question');
    ids.add(q.id);const choices=ordered(q);
    return [q.id,q.options.map(option=>choices.indexOf(option)).join('')];
  });
  return encode([CHALLENGE_SCHEMA,fingerprint(questions),rows]);
}
export function readChallenge(token,bank) {
  try {
    const value=decode(token);
    if(!Array.isArray(value)||value.length!==3||value[0]!==CHALLENGE_SCHEMA)return {ok:false,reason:'version'};
    const [,signature,rows]=value;
    if(typeof signature!=='string'||!Array.isArray(rows)||!rows.length||rows.length>CHALLENGE_LIMIT)throw Error('invalid');
    const lookup=new Map(bank.map(q=>[q.id,q])),ids=new Set(),questions=[];
    for(const row of rows) {
      if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||ids.has(row[0])||typeof row[1]!=='string'||!/^[0-3]{4}$/.test(row[1])||new Set(row[1]).size!==4)throw Error('invalid');
      const q=lookup.get(row[0]);if(!q)return {ok:false,reason:'expired'};
      const options=ordered(q);questions.push({...q,options:[...row[1]].map(i=>options[Number(i)])});ids.add(q.id);
    }
    if(fingerprint(questions)!==signature)return {ok:false,reason:'expired'};
    return {ok:true,questions,token};
  } catch {return {ok:false,reason:'invalid'};}
}
export function challengeFromHash(hash) {
  return hash.startsWith('#challenge=')?hash.slice(11):null;
}
export function challengeURL(questions,base) {
  const url=new URL(base);url.search='';url.hash=`challenge=${createChallenge(questions)}`;return url.href;
}

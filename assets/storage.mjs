export const STORAGE_KEY='apple-quiz:v1:';
export function createStorage(storage,{onError=()=>{}}={}) {
  let warned=false;
  return {
    read(key,fallback){try{return JSON.parse(storage.getItem(STORAGE_KEY+key))??fallback;}catch{return fallback;}},
    write(key,value){try{storage.setItem(STORAGE_KEY+key,JSON.stringify(value));return true;}catch{if(!warned){warned=true;onError();}return false;}},
    remove(key){try{storage.removeItem(STORAGE_KEY+key);}catch{}},
  };
}

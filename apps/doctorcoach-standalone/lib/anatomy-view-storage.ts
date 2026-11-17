/** Program maps are ephemeral; the standalone learning atlas retains its existing view state. */
export function readAnatomyView(key:string,enabled:boolean,storage?:Pick<Storage,'getItem'>){
 if(!enabled)return null;try{const value=JSON.parse((storage??sessionStorage).getItem(key)??'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}
}
export function writeAnatomyView(key:string,value:unknown,enabled:boolean,storage?:Pick<Storage,'setItem'>){
 if(!enabled)return;try{(storage??sessionStorage).setItem(key,JSON.stringify(value));}catch{}
}

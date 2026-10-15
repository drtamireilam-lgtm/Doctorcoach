'use client';
import {apiResponseFailure} from '../lib/api-response';
import {useCallback,useEffect,useRef,useState} from 'react';
import {emptyResource,resourceForUrl,failedResource} from '../lib/care-resource-state';
export class CareRequestError extends Error {constructor(message:string,public status:number){super(message);}}
export async function careRequest<T>(url:string,body?:unknown,method='POST'):Promise<T>{let response:Response;try{response=await fetch(url,{method:body?method:'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});}catch{throw new CareRequestError('אין חיבור לשרת. הנתונים נשארו בטופס; נסו שוב.',0);}const data=await response.json().catch(()=>null) as (T&{error?:string})|null;const failure=apiResponseFailure(response,data!==null);if(failure)throw new CareRequestError(failure.message,failure.status);if(!response.ok||!data)throw new CareRequestError(data?.error??'לא ניתן להשלים את הפעולה כרגע.',response.status);return data;}
export function useCareResource<T>(url:string){
 const [state,setState]=useState(()=>emptyResource<T>(url));
 const scope=useRef({url,epoch:0});const sequence=useRef(0);
 if(scope.current.url!==url)scope.current={url,epoch:scope.current.epoch+1};
 const epoch=scope.current.epoch;
 const setData=useCallback((data:T|null)=>{
  if(scope.current.epoch!==epoch)return;
  // A saved response is newer than any GET already in flight.
  sequence.current++;
  setState({url,data,error:'',status:200,loading:false});
 },[url,epoch]);
 const reload=useCallback(async()=>{
  if(scope.current.epoch!==epoch)return;
  const seq=++sequence.current;
  const current=()=>seq===sequence.current&&epoch===scope.current.epoch;
  setState(previous=>({...resourceForUrl(previous,url),loading:true,error:''}));
  try{
   const data=await careRequest<T>(url);
   if(current())setState({url,data,error:'',status:200,loading:false});
  }catch(e){
   if(current())setState(previous=>failedResource(previous,url,(e as Error).message,e instanceof CareRequestError?e.status:0));
  }
 },[url,epoch]);
 useEffect(()=>{void reload();return()=>{sequence.current++;};},[reload]);
 return {...resourceForUrl(state,url),setData,reload};
}
export function useCareAction(){const lock=useRef(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');async function run<T>(task:()=>Promise<T>,success='נשמר בהצלחה.'):Promise<T|undefined>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{const value=await task();setMessage(success);return value;}catch(e){setError((e as Error).message);return undefined;}finally{lock.current=false;setBusy(false);}}return {busy,message,error,run,setError};}

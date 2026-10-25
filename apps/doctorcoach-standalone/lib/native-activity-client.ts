import type {ActivityDay,ActivityPlatform} from './activity.ts';

export type NativeActivityCommand={command:'bind'|'invalidate'|'connect'|'sync'|'disconnect';accountScope:string;connection?:{id:string;generation:string};revision?:number};
export type NativeActivityResult={requestId:string;accountScope:string;status:'available'|'unavailable'|'permission-required'|'no-readable-data'|'ok'|'error';platform?:ActivityPlatform;days?:ActivityDay[];message?:string};
export type NativeActivityTransport={request:(payload:NativeActivityCommand&{requestId:string})=>void};
type NativeWindow=Window&{webkit?:{messageHandlers?:{doctorcoach?:{postMessage:(message:unknown)=>void}}};doctorcoach?:{postMessage:(message:string)=>void}};

export function nativeActivityTransport():NativeActivityTransport|undefined{
 if(typeof window==='undefined')return;
 const surface=window as NativeWindow;
 if(surface.webkit?.messageHandlers?.doctorcoach)return {request:p=>surface.webkit!.messageHandlers!.doctorcoach!.postMessage(p)};
 if(surface.doctorcoach?.postMessage)return {request:p=>surface.doctorcoach!.postMessage(JSON.stringify(p))};
}

/** Requests carry no bearer credentials. Identity comes from the authenticated server connection. */
export function nativeActivityRequest(command:NativeActivityCommand,transport=nativeActivityTransport(),events:EventTarget=window,timeoutMs=60000,signal?:AbortSignal):Promise<NativeActivityResult>{
 return new Promise((resolve,reject)=>{
  if(!transport){reject(new Error('Native health connection requires the DoctorCoach mobile app.'));return;}
  const requestId=crypto.randomUUID();
  const cleanup=()=>{clearTimeout(timeout);events.removeEventListener('doctorcoach:native-result',receive);signal?.removeEventListener('abort',abort);};
  const abort=()=>{cleanup();reject(new Error('Native health request aborted.'));};
  const receive=(event:Event)=>{
   const result=(event as CustomEvent<NativeActivityResult>).detail;
   if(!result||result.requestId!==requestId||result.accountScope!==command.accountScope)return;
   if(!['available','unavailable','permission-required','no-readable-data','ok','error'].includes(result.status))return;
   cleanup();resolve(result);
  };
  const timeout=setTimeout(()=>{cleanup();reject(new Error('Native health request timed out.'));},timeoutMs);
  events.addEventListener('doctorcoach:native-result',receive);signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  try{transport.request({...command,requestId});}catch(error){cleanup();reject(error);}
 });
}

export function invalidateNativeActivity(accountScope:string){
 nativeActivityTransport()?.request({command:'invalidate',accountScope,requestId:crypto.randomUUID()});
}

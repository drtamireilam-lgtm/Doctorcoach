// Browser APIs can remain pending indefinitely (notably serviceWorker.ready).
// Bound each stage so a failed activation releases the UI and explains recovery.
export async function pushStep<T>(task:Promise<T>,message:string,timeoutMs=15000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),timeoutMs);})]);}
 finally{if(timer!==undefined)clearTimeout(timer);}
}
export async function readyPushWorker(container:Pick<ServiceWorkerContainer,'getRegistration'|'register'|'ready'>,timeoutMs=15000){
 const message='שירות ההתראות במכשיר לא הושלם בזמן. סגרו ופתחו את DoctorCoach מהאייקון במסך הבית ונסו שוב.';
 const existing=await pushStep(container.getRegistration('/'),message,timeoutMs);
 if(existing?.active)return existing;
 await pushStep(container.register('/sw.js',{scope:'/',updateViaCache:'none'}),message,timeoutMs);
 return pushStep(container.ready,message,timeoutMs);
}

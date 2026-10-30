'use client';
import {useCallback,useSyncExternalStore} from 'react';
import {defaultTimerState,restoreTimerState,type TimerState} from '../lib/rest-timer';
const states=new Map<string,TimerState>(),listeners=new Map<string,Set<()=>void>>();
/** Tab-scoped convenience state only; no workout, identity or medical records. */
export function useRestTimer(sessionId:string){
 const key='doctorcoach-rest:'+sessionId;
 const snapshot=useCallback(()=>{
  if(!states.has(key)){let raw=null;try{raw=sessionStorage.getItem(key);}catch{}states.set(key,restoreTimerState(raw));}
  return states.get(key)!;
 },[key]);
 const subscribe=useCallback((notify:()=>void)=>{let group=listeners.get(key);if(!group){group=new Set();listeners.set(key,group);}group.add(notify);return()=>{group!.delete(notify);if(!group!.size)listeners.delete(key);};},[key]);
 const state=useSyncExternalStore(subscribe,snapshot,()=>defaultTimerState);
 const update=useCallback((next:TimerState)=>{states.set(key,next);try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}listeners.get(key)?.forEach(notify=>notify());},[key]);
 return [state,update] as const;
}

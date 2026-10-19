'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CoachDraft,CoachDraftState} from '../lib/coach-drafts';
import {ProgramAutosave,draftContentKey} from '../lib/program-autosave';
import {allowProgramDraftLeave,hasUnsavedProgramDraft,setProgramDraftDirty,removeProgramDraft} from '../lib/program-draft-navigation';
import {careRequest,useCareResource} from './use-care';

export function useProgramAutosave({base,readUrl,clientId,workspaceId,payload,paused}:{base:string;readUrl:string;clientId:string;workspaceId?:string;payload:CoachDraft;paused:boolean}){
 const pausedRef=useRef(paused);pausedRef.current=paused;const resource=useCareResource<CoachDraftState>(readUrl);const [,render]=useState(0);const active=useRef(false);const token=useRef({});const machineRef=useRef<ProgramAutosave|null>(null);
 if(!machineRef.current)machineRef.current=new ProgramAutosave(payload,(draft,version)=>careRequest<CoachDraftState>(base,{action:'save',clientId,workspaceId,version,...draft}),()=>{if(active.current)render(n=>n+1);},state=>{if(active.current)resource.setData(state);});
 const machine=machineRef.current;machine.setContent(payload);const key=draftContentKey(payload);
 useEffect(()=>{active.current=true;machine.closed=false;return()=>{active.current=false;machine.close();removeProgramDraft(token.current);};},[machine]);
 useLayoutEffect(()=>{setProgramDraftDirty(token.current,machine.dirty);});
 useEffect(()=>{
  if(resource.data&&!machine.ready)machine.receive(resource.data);
  if(paused||resource.error||!machine.ready||machine.blocked||!machine.dirty||machine.failedKey===key)return;
  const timer=setTimeout(()=>{if(!pausedRef.current)void machine.save();},1500);return()=>clearTimeout(timer);
 },[key,paused,resource.data,resource.error,machine]);
 useEffect(()=>{
  const route=window.location.hash;
  const unload=(event:BeforeUnloadEvent)=>{if(hasUnsavedProgramDraft()){event.preventDefault();event.returnValue='';}};
  const hash=(event:Event)=>{if(window.location.hash!==route&&!allowProgramDraftLeave()){window.history.replaceState(null,'',window.location.pathname+window.location.search+route);event.stopImmediatePropagation();}};
  const link=(event:MouseEvent)=>{const anchor=(event.target as Element).closest?.('a[href]');if(!(anchor instanceof HTMLAnchorElement)||anchor.target==='_blank'||anchor.hasAttribute('download')||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;const url=new URL(anchor.href);if(url.href===window.location.href)return;if(!allowProgramDraftLeave()){event.preventDefault();event.stopImmediatePropagation();}};
  const online=()=>{if(!pausedRef.current&&machine.dirty&&!machine.blocked)void machine.save(true);};
  window.addEventListener('beforeunload',unload);window.addEventListener('hashchange',hash,true);window.addEventListener('popstate',hash,true);document.addEventListener('click',link,true);window.addEventListener('online',online);
  return()=>{window.removeEventListener('beforeunload',unload);window.removeEventListener('hashchange',hash,true);window.removeEventListener('popstate',hash,true);document.removeEventListener('click',link,true);window.removeEventListener('online',online);};
 },[machine]);
 return {resource,machine,async adopt(state:CoachDraftState,draft:CoachDraft){machine.adopt(state,draft);resource.setData(state);},async reset(draft:CoachDraft){resource.setData(null);machine.reset(draft);try{const state=await careRequest<CoachDraftState>(readUrl);if(!machine.closed){resource.setData(state);machine.receive(state);}}catch(error){if(!machine.closed){machine.error=(error as Error).message;render(n=>n+1);}}}};
}

'use client';
import {useEffect} from 'react';
import {useCareResource} from './use-care';
import {exercises as builtins,type Exercise} from '../lib/content';
import type {CustomCatalog,CustomExercise} from '../lib/custom-exercise-types';
export function useCustomExercises(clientId?:string){
 const resource=useCareResource<CustomCatalog&{assigned:CustomExercise[]}>('/api/exercises'+(clientId?'?client='+encodeURIComponent(clientId):''));
 useEffect(()=>{const changed=()=>void resource.reload();window.addEventListener('doctorcoach:custom-exercises',changed);return()=>window.removeEventListener('doctorcoach:custom-exercises',changed);},[resource.reload]);
 const customs=[...new Map([...(resource.data?.assigned??[]),...(resource.data?.items.filter(r=>r.owned||r.state==='published').map(r=>r.exercise)??[])].map(e=>[e.id,e])).values()];
 return {...resource,customs,exercises:[...builtins,...customs] as Exercise[]};
}
export function refreshCustomExercises(){window.dispatchEvent(new Event('doctorcoach:custom-exercises'));}

'use client';
import {useSyncExternalStore} from 'react';
import {useLanguage} from './language-provider';
import type {LoadUnit} from '../lib/load-units';
const event='doctorcoach-load-unit',key='doctorcoach:display-load-unit';
const subscribe=(notify:()=>void)=>{window.addEventListener(event,notify);window.addEventListener('storage',notify);return()=>{window.removeEventListener(event,notify);window.removeEventListener('storage',notify);};};
const snapshot=():LoadUnit=>{try{return localStorage.getItem(key)==='lb'?'lb':'kg';}catch{return 'kg';}};
export function useLoadUnit(){return useSyncExternalStore(subscribe,snapshot,()=> 'kg' as LoadUnit);}
export function LoadUnitPicker(){const unit=useLoadUnit(),english=useLanguage().language==='en';return <label className="care-field load-unit-picker"><span>{english?'Display load unit':'יחידת משקל לתצוגה'}</span><select value={unit} onChange={e=>{try{localStorage.setItem(key,e.target.value);}catch{}window.dispatchEvent(new Event(event));}}><option value="kg">kg · {english?'Kilograms':'קילוגרם'}</option><option value="lb">lb · {english?'Pounds':'פאונד'}</option></select></label>;}

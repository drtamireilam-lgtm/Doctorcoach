'use client';
import {Localize} from "../components/language-provider";
import {CareSelect} from './care-ui';
import {canonicalEffort,effortName,effortValue} from '../lib/effort';
import type {EffortScale} from '../lib/effort';
export function EffortScaleSelect({value,onChange,disabled=false}:{value?:EffortScale;onChange:(v:EffortScale)=>void;disabled?:boolean}){return <Localize>{<CareSelect label="שיטת דיווח מאמץ" value={value??'rpe'} onChange={v=>onChange(v as EffortScale)} disabled={disabled} options={[{value:'rpe',label:'RPE — מאמץ נתפס'},{value:'rir',label:'RIR — חזרות ברזרבה'}]}/>}</Localize>;}
export function EffortInput({scale,value,onChange,target=false,required=false,disabled=false,ariaLabel}:{scale?:EffortScale;value:number|null|undefined;onChange:(v:number|null)=>void;target?:boolean;required?:boolean;disabled?:boolean;ariaLabel?:string}){return <Localize>{<label className="care-field"><span>{effortName(scale)} {target?'יעד':'בפועל'}</span><input type="number" inputMode="decimal" min={scale==='rir'?0:1} max={scale==='rir'?9:10} step="0.5" value={effortValue(value,scale)??''} onChange={e=>onChange(canonicalEffort(e.target.value,scale))} disabled={disabled} required={required} aria-label={ariaLabel} placeholder={scale==='rir'?'0–9':'1–10'}/></label>}</Localize>;}

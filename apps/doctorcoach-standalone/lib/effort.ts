export type EffortScale='rpe'|'rir';
export const effortName=(scale?:EffortScale)=>scale==='rir'?'RIR':'RPE';
export const effortValue=(rpe:number|null|undefined,scale?:EffortScale)=>rpe==null?null:scale==='rir'?10-rpe:rpe;
export function canonicalEffort(value:string,scale?:EffortScale):number|null{if(value==='')return null;const n=Number(value);return scale==='rir'?10-n:n;}
export const effortTarget=(item:{targetRpe?:number|null;effortScale?:EffortScale})=>item.targetRpe==null?'לא הוגדר':`${effortName(item.effortScale)} יעד ${effortValue(item.targetRpe,item.effortScale)}`;

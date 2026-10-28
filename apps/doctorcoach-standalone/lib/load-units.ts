export type LoadUnit='kg'|'lb';
export type LoadMetadata={sourceValue:number;sourceUnit:LoadUnit;basis:'total'|'per-side'};
const poundsToKg=0.45359237;
export const toKg=(value:number,unit:LoadUnit)=>unit==='lb'?value*poundsToKg:value;
export const fromKg=(value:number,unit:LoadUnit)=>unit==='lb'?value/poundsToKg:value;
export const displayLoad=(weight:number,unit:LoadUnit)=>fromKg(weight,unit);
export const hasTotalLoad=(item:{load?:LoadMetadata})=>item.load?.basis!=='per-side';
export function parseLoadMetadata(raw:unknown,weight:number):LoadMetadata|undefined{
 if(raw==null)return undefined;
 if(typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid load metadata.');
 const {sourceValue,sourceUnit,basis}=raw as Record<string,unknown>;
 if(typeof sourceValue!=='number'||!Number.isFinite(sourceValue)||sourceValue<0||(sourceUnit!=='kg'&&sourceUnit!=='lb')||(basis!=='total'&&basis!=='per-side'))throw new Error('Invalid load metadata.');
 const canonical=toKg(sourceValue,sourceUnit);
 if(canonical>1000||!Number.isFinite(weight)||Math.abs(canonical-weight)>1e-6)throw new Error('Load metadata does not match the recorded weight.');
 return {sourceValue,sourceUnit,basis};
}

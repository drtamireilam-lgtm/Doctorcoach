'use client';
import type {PlanItem} from '../lib/training';
export function RepetitionRange({item,onChange}:{item:PlanItem;onChange:(patch:Partial<PlanItem>)=>void}){
 if(item.unit!=='reps')return null;
 return <label className="care-field">גבול עליון לחזרות (אופציונלי)<input type="number" min={item.reps} max={100} value={item.repsMax??''} onChange={e=>onChange({repsMax:e.target.value===''?null:Number(e.target.value)})}/><span className="field-hint">מספר החזרות הרגיל הוא הגבול התחתון. ריק = יעד חזרות יחיד.</span></label>;
}

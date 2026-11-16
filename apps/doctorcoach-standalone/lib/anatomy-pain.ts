import detailed from './prepared/detailed-model.json' with {type:'json'};
import {inputRecord,integerField,textField} from './care.ts';
import {TrainingError} from './training.ts';
export const painModelVersion=detailed.glbSha256;
export const painStructures=detailed.structures;
export type PainPoint={structureId:string;x:number;y:number;z:number};
export type AnatomyPainData=PainPoint&{modelVersion:string;view:'front'|'back'|'left'|'right';side:string;placement:'surface'|'centre';intensity:number;occurredAt:string;timing:'before'|'after'|'other';notes:string;exerciseId:string};
export type AnatomyPainRecord={id:string;data:AnatomyPainData;createdAt:string};
export type AnatomyPainBundle={ownerId:string;records:AnatomyPainRecord[]};
export function parseAnatomyPain(input:unknown,now=new Date()):AnatomyPainData{
 const p=inputRecord(input);const fail=()=>{throw new TrainingError('פרטי מיקום הכאב אינם תקינים. בחרו נקודה ותאריך מחדש.');};
 const structure=painStructures.find(s=>s.id===p.structureId);if(!structure||p.modelVersion!==painModelVersion||p.side!==structure.side)fail();
 for(const key of ['x','y','z'])if(typeof p[key]!=='number'||!Number.isFinite(p[key])||(p[key] as number)<0||(p[key] as number)>1)fail();
 if(typeof p.view!=='string'||typeof p.placement!=='string'||typeof p.timing!=='string'||!['front','back','left','right'].includes(p.view)||!['surface','centre'].includes(p.placement)||!['before','after','other'].includes(p.timing))fail();
 const at=textField(p.occurredAt,'מועד הדיווח',40,20),match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/.exec(at);
 if(!match||!Number.isFinite(Date.parse(match[1]+'T12:00:00Z'))||new Date(match[1]+'T12:00:00Z').toISOString().slice(0,10)!==match[1]||+match[2]>23||+match[3]>59||+(match[4]??0)>59||+(match[6]??0)>14||+(match[7]??0)>59||(+match[6]===14&&+match[7]!==0))fail();
 const timestamp=Date.parse(at);if(!Number.isFinite(timestamp)||timestamp>now.getTime()||timestamp<Date.parse('2000-01-01T00:00:00Z'))fail();
 const exerciseId=textField(p.exerciseId??'','תרגיל',150);if(exerciseId&&!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,149}$/.test(exerciseId))fail();
 return {modelVersion:painModelVersion,structureId:structure!.id,x:p.x as number,y:p.y as number,z:p.z as number,view:p.view as AnatomyPainData['view'],side:structure!.side,placement:p.placement as AnatomyPainData['placement'],intensity:integerField(p.intensity,'עוצמת כאב',0,10),occurredAt:new Date(timestamp).toISOString(),timing:p.timing as AnatomyPainData['timing'],notes:textField(p.notes??'','הערה',1500),exerciseId};
}

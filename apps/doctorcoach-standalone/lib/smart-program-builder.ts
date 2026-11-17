import {exercises} from './content.ts';
import {parsePlanItem,type PlanItem} from './training.ts';
export type SmartPattern='squat'|'hinge'|'push'|'pull'|'core';
export type SmartEquipment='dumbbells'|'bench'|'barbell'|'cable'|'machine';
export type SmartProgramInput={goal:'general'|'strength'|'hypertrophy';experience:'beginner'|'intermediate'|'advanced';days:number;durationMinutes:number;equipment:SmartEquipment[];preferredExerciseIds:string[];excludedExerciseIds:string[];excludedPatterns:SmartPattern[];targetRpe:number;repMin:number;repMax:number};
export type SmartIssue={code:'duplicate'|'pattern-gap'|'volume'|'equipment'|'restricted'|'invalid-prescription';dayId:string;exerciseId?:string};
export const smartPatterns:SmartPattern[]=['squat','hinge','push','pull','core'];
// Explicit curated eligibility metadata. Catalog injury labels are never used to infer suitability.
export const smartExercisePool:{id:string;pattern:SmartPattern;equipment:SmartEquipment[];timed?:boolean}[]=[
{id:'goblet',pattern:'squat',equipment:['dumbbells']},{id:'sit-stand',pattern:'squat',equipment:['bench']},
{id:'hip-bridge',pattern:'hinge',equipment:[]},{id:'deadlift',pattern:'hinge',equipment:['barbell']},
{id:'bench',pattern:'push',equipment:['dumbbells','bench']},{id:'push-up',pattern:'push',equipment:[]},
{id:'single-arm-db-row',pattern:'pull',equipment:['dumbbells','bench']},{id:'cable-row',pattern:'pull',equipment:['cable']},
{id:'plank',pattern:'core',equipment:[],timed:true}];
export const defaultSmartProgramInput:SmartProgramInput={goal:'general',experience:'beginner',days:3,durationMinutes:45,equipment:['dumbbells','bench'],preferredExerciseIds:[],excludedExerciseIds:[],excludedPatterns:[],targetRpe:7,repMin:8,repMax:12};
function eligible(e:typeof smartExercisePool[number],input:SmartProgramInput){return exercises.some(x=>x.id===e.id)&&e.equipment.every(x=>input.equipment.includes(x))&&!input.excludedExerciseIds.includes(e.id)&&!input.excludedPatterns.includes(e.pattern);}
function validate(input:SmartProgramInput){if(!input||typeof input!=='object')throw new Error('Invalid smart program settings');for(const [value,allowed] of [[input.equipment,['dumbbells','bench','barbell','cable','machine']],[input.excludedPatterns,smartPatterns],[input.preferredExerciseIds,smartExercisePool.map(e=>e.id)],[input.excludedExerciseIds,smartExercisePool.map(e=>e.id)]] as [unknown,string[]][]){if(!Array.isArray(value)||value.length>allowed.length||new Set(value).size!==value.length||value.some(x=>typeof x!=='string'||!allowed.includes(x)))throw new Error('Invalid smart program selection');}if(!['general','strength','hypertrophy'].includes(input.goal)||!['beginner','intermediate','advanced'].includes(input.experience)||!Number.isInteger(input.days)||input.days<1||input.days>7||!Number.isInteger(input.durationMinutes)||input.durationMinutes<15||input.durationMinutes>120||!Number.isFinite(input.targetRpe)||input.targetRpe<1||input.targetRpe>10||input.targetRpe*2%1||!Number.isInteger(input.repMin)||!Number.isInteger(input.repMax)||input.repMin<1||input.repMax>100||input.repMin>input.repMax)throw new Error('Invalid smart program settings');}
export function checkSmartProgram(items:PlanItem[],input:SmartProgramInput,options:{maxSetsPerDay?:number;requiredPatterns?:SmartPattern[]}={}):SmartIssue[]{
 validate(input);if(!options||typeof options!=='object'||options.maxSetsPerDay!==undefined&&(!Number.isInteger(options.maxSetsPerDay)||options.maxSetsPerDay<1||options.maxSetsPerDay>100)||options.requiredPatterns!==undefined&&(!Array.isArray(options.requiredPatterns)||options.requiredPatterns.length>5||options.requiredPatterns.some(p=>!smartPatterns.includes(p))))throw new Error('Invalid quality settings');if(!Array.isArray(items)||items.length>500)throw new Error('Invalid draft items');
 const issues:SmartIssue[]=[];const days=[...new Set([...Array.from({length:input.days},(_,i)=>String(i+1)),...items.map(i=>i.dayId??'1')])];
 for(const dayId of days){const day=items.filter(i=>(i.dayId??'1')===dayId),seen=new Set<string>();
 for(const item of day){const e=smartExercisePool.find(e=>e.id===item.exerciseId);if(seen.has(item.exerciseId))issues.push({code:'duplicate',dayId,exerciseId:item.exerciseId});seen.add(item.exerciseId);
 try{parsePlanItem(item);if(!e||!exercises.some(x=>x.id===item.exerciseId))throw Error();}catch{issues.push({code:'invalid-prescription',dayId,exerciseId:item.exerciseId});}
 if(e&&!e.equipment.every(x=>input.equipment.includes(x)))issues.push({code:'equipment',dayId,exerciseId:item.exerciseId});
 if(input.excludedExerciseIds.includes(item.exerciseId)||e&&input.excludedPatterns.includes(e.pattern))issues.push({code:'restricted',dayId,exerciseId:item.exerciseId});}
 for(const pattern of options.requiredPatterns??smartPatterns)if(!day.some(i=>smartExercisePool.find(e=>e.id===i.exerciseId)?.pattern===pattern))issues.push({code:'pattern-gap',dayId,exerciseId:pattern});
 if(day.reduce((sum,i)=>sum+i.sets,0)>(options.maxSetsPerDay??20))issues.push({code:'volume',dayId});}
 return issues;
}
export function generateSmartProgram(input:SmartProgramInput):{items:PlanItem[];issues:SmartIssue[]}{validate(input);const items:PlanItem[]=[];
 const sets=input.experience==='beginner'?2:input.goal==='hypertrophy'?4:3;
 const slots=Math.min(5,Math.floor(30/input.days),Math.max(2,Math.floor(input.durationMinutes/(sets*2+2))));
 for(let d=1;d<=input.days;d++){const patterns=[...smartPatterns.slice(0,4).slice((d-1)%4),...smartPatterns.slice(0,(d-1)%4),'core'] as SmartPattern[];
 for(const pattern of patterns.slice(0,slots)){const pool=smartExercisePool.filter(e=>e.pattern===pattern&&eligible(e,input)).sort((a,b)=>Number(input.preferredExerciseIds.includes(b.id))-Number(input.preferredExerciseIds.includes(a.id)));
 const e=pool[0];if(!e)continue;items.push({exerciseId:e.id,occurrenceId:`smart-${d}-${e.id}`,dayId:String(d),sets,reps:e.timed?25:input.repMin,...(e.timed?{}:{repsMax:input.repMax}),unit:e.timed?'seconds':'reps',weight:0,weightUnspecified:true,notes:'',restSeconds:input.goal==='strength'?120:60,targetRpe:input.targetRpe,effortScale:'rpe',workoutSection:'main'});}}
 return {items,issues:checkSmartProgram(items,input)};
}



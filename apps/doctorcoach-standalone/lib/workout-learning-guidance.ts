import english from './prepared/workout-learning-en.json' with {type:'json'};
type GuidanceSource={id:string;desc:string;cues:string[]};
const entries=english as Record<string,{sourceDesc:string;sourceCues:string[];desc:string;cues:string[]}>;
/** Prepared from existing translations plus translated authored guidance; never show stale translations. */
export function workoutLearningGuidance(exercise:GuidanceSource,language:'he'|'en'){
 if(language==='he')return {available:true,desc:exercise.desc,cues:[...exercise.cues]};
 const entry=entries[exercise.id];
 if(!entry||entry.sourceDesc!==exercise.desc||JSON.stringify(entry.sourceCues)!==JSON.stringify(exercise.cues))return {available:false,desc:'English instructions for this version of the exercise are not available yet.',cues:[] as string[]};
 return {available:true,desc:entry.desc,cues:[...entry.cues]};
}

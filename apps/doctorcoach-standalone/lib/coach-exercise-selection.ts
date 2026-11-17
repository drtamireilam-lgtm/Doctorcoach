/** Batch selection is a private editor queue, not a change to a saved program. */
export function coachExerciseSelectionStatus(ids:readonly string[],totalCount:number,availableIds:readonly string[]){
 const validCount=Number.isInteger(totalCount)&&totalCount>=0&&totalCount<=30,remaining=validCount?30-totalCount:0,available=new Set(availableIds),unavailable=ids.filter(id=>!available.has(id));
 return {remaining,unavailable,canAdd:validCount&&ids.length>0&&ids.length<=remaining&&new Set(ids).size===ids.length&&unavailable.length===0};
}
/** Removal is always allowed, even after another editor action fills the program. */
export function toggleCoachExerciseSelection(ids:readonly string[],id:string,remaining:number):string[]{
 if(ids.includes(id))return ids.filter(selected=>selected!==id);
 if(!id||!Number.isInteger(remaining)||remaining<1||ids.length>=remaining)return [...ids];
 return [...ids,id];
}

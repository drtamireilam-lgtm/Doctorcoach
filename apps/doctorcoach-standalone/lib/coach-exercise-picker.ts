import {searchExerciseNames,type NamedExercise} from './exercise-search.ts';
import {exerciseFamily} from './exercise-families.ts';
export const equipmentOptions=[{value:'all',label:'כל הציוד'},{value:'dumbbell',label:'משקולות יד'},{value:'barbell',label:'מוט'},{value:'cable',label:'כבל'},{value:'machine',label:'מכונה'},{value:'band',label:'גומייה'},{value:'bodyweight',label:'משקל גוף'},{value:'unknown',label:'ציוד אחר או לא צוין'}];
const explicit:Record<string,string>={bench:'dumbbell','hammer-curl':'dumbbell','back-squat':'barbell','front-squat':'barbell','band-er':'band','bird-dog':'bodyweight','dead-bug':'bodyweight','hip-bridge':'bodyweight','side-abduction':'bodyweight','chin-tuck':'bodyweight'};
export function pickerEquipment(e:NamedExercise):string[]{
 const text=(e.equipment?e.equipment:e.name+' '+e.en).toLowerCase();
 const found=[['dumbbell',/dumbbell|\bdb\b|משקולות יד|משקולות/],['barbell',/barbell|מוט/],['cable',/cable|כבל|פולי/],['machine',/machine|מכונה|smith|סמית/],['band',/\bband\b|גומי|גומייה/],['bodyweight',/bodyweight|body weight|משקל גוף/]] as const;
 const matches=found.filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
 return matches.length?matches:!e.equipment&&explicit[e.id]?[explicit[e.id]]:['unknown'];
}
export function filterCoachExercises<T extends NamedExercise>(items:readonly T[],query:string,group='all',equipment='all',family='all'){
 return searchExerciseNames(items.filter(e=>(group==='all'||(e.group||e.area||'לא צוין')===group)&&(equipment==='all'||pickerEquipment(e).includes(equipment))&&(family==='all'||exerciseFamily(e)===family)),query);
}

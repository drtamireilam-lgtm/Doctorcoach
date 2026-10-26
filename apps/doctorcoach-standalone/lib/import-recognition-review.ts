import {exercises} from './content.ts';
import {matchExerciseForImport,normalizeImportExerciseName} from './exercise-matching.ts';
import type {NamedExercise} from './exercise-search.ts';

export type ImportRecognitionCategory='missing-name'|'heading'|'instruction'|'uncertain'|'ambiguous-variant'|'missing-variant';
export type ImportRecognitionReview={category:ImportRecognitionCategory;he:string;en:string;candidateIds:string[]};
type Rule={names:string[];category:ImportRecognitionCategory;he:string;en:string;candidateIds?:string[]};
// Review-only evidence from the authorized development workbooks. These are
// NOT aliases: no rule may assign, strip qualifiers or silently skip a row.
const rules:Rule[]=[
 {names:['leg curl machine'],category:'ambiguous-variant',he:'מכונת כפיפת ברכיים: חסר אם הביצוע בישיבה או בשכיבה. בחרו את התנוחה לפי המקור.',en:'Machine leg curl: seated or lying posture is missing. Choose the posture from the source.',candidateIds:['seated-curl','lying-curl']},
 {names:['Hip Abduction'],category:'ambiguous-variant',he:'הרחקת ירך: חסרים הציוד ותנוחת הביצוע. בדקו אם מדובר במכונה, בכבל או בשכיבה.',en:'Hip abduction: equipment and posture are missing. Check for machine, cable or side-lying execution.',candidateIds:['hip-abduction-machine','cable-abduction','side-abduction']},
 {names:['Hip Adduction'],category:'ambiguous-variant',he:'קירוב ירך: חסרים הציוד ותנוחת הביצוע. אין להסיק שמדובר במכונה.',en:'Hip adduction: equipment and posture are missing. Do not assume a machine.',candidateIds:['adduction','adductor-squeeze']},
 {names:['tricep extension pully','Tricep extension pulley with straight bar','יד אחורי ת כבל'],category:'ambiguous-variant',he:'פשיטת מרפקים בכבל: חסר כיוון הביצוע. גם ידית מוט ישר אינה מבדילה בין דחיפה מטה לבין פשיטה מעל הראש.',en:'Cable triceps extension: movement direction is missing. A straight-bar attachment does not distinguish pushdown from overhead extension.',candidateIds:['triceps-pushdown','cable-overhead-triceps']},
 {names:['bicep curl bench lean 45° back'],category:'ambiguous-variant',he:'כפיפת מרפקים על ספסל בשיפוע: הציוד אינו מצוין. אין להסיק שמדובר במשקולות יד.',en:'Incline-bench curl: the implement is unspecified. Do not assume dumbbells.'},
 {names:['narrow grip pulldown','פולי עליון צר'],category:'ambiguous-variant',he:'משיכה עליונה צרה: השם אינו מזהה את סוג המתקן. חפשו את הווריאציה המתאימה; אין להחליף אוטומטית במכונת המר או באחיזה בינונית.',en:'Narrow pulldown: the name does not identify the machine type. Search for the appropriate variant; do not automatically substitute a Hammer machine or medium grip.'},
 {names:['hammer strength narrow grip pulling machine'],category:'ambiguous-variant',he:'מכונת המר באחיזה צרה: חסר אם זו חתירה או משיכה עליונה. בדקו את כיוון התנועה.',en:'Narrow-grip Hammer machine: row versus pulldown is unspecified. Check the movement direction.'},
 {names:['single hand pullover'],category:'ambiguous-variant',he:'פולאובר ביד אחת: הציוד אינו מצוין. אין להחליף אוטומטית בפולאובר דו־צדדי בכבל.',en:'Single-arm pullover: equipment is unspecified. Do not substitute a bilateral cable pullover.'},
 {names:['כסא רומי'],category:'ambiguous-variant',he:'שם המתקן אינו מגדיר את התרגיל. בדקו אם מדובר בפשיטת גב או בתרגיל בטן.',en:'The apparatus name does not identify the movement. Check for back extension versus an abdominal exercise.'},
 {names:['הרחקה בישיבה במכונה'],category:'ambiguous-variant',he:'הרחקה במכונה בישיבה: חסר אם מדובר בירך או בכתף. בדקו את אזור הגוף.',en:'Seated machine abduction: hip versus shoulder is unspecified. Check the body region.'},
 {names:['kickback'],category:'ambiguous-variant',he:'Kickback עשוי לתאר פשיטת ירך או מרפק. חסרים אזור הגוף והציוד.',en:'Kickback can mean hip or elbow extension. Body region and equipment are missing.'},
 {names:['pronated shoulder flexion'],category:'ambiguous-variant',he:'כפיפת כתף בפרונציה: הציוד ותנוחת הביצוע חסרים. אין להתאים אוטומטית לתרגיל עם ציוד מסוים.',en:'Pronated shoulder flexion: equipment and posture are missing. Do not assign an implement-specific exercise.'},
 {names:['wide grip pully'],category:'ambiguous-variant',he:'פולי באחיזה רחבה: חסר אם זו חתירה או משיכה עליונה. בדקו גם את סוג המכונה.',en:'Wide-grip pulley: row versus pulldown is unspecified. Check the machine type too.'},
 {names:['Seated Leg Press','incline machine press','Side lateral machine','biceps in machine','כפיפת ירך עם רגל ישרה כנגד פולי','מקבילים','wide grip pulldown'],category:'missing-variant',he:'לא נמצאה התאמה ברורה לשם הזה. חפשו בספרייה ובדקו את המקור לפני יצירת תרגיל חדש; שמרו על הציוד, הזווית והאחיזה.',en:'No clear match was found for this name. Search the catalog and check the source before creating a new exercise; preserve equipment, angle and grip.'},
];
const key=(name:string)=>normalizeImportExerciseName(name).split(' ').sort().join(' ');
const byName=new Map(rules.flatMap(rule=>rule.names.map(name=>[key(name),rule] as const)));
/** Null leaves unknown names on the existing suggestions/manual-search path. */
export function reviewImportExerciseName(name:string,catalog:readonly NamedExercise[]=exercises):ImportRecognitionReview|null{
 if(matchExerciseForImport(name,catalog,{allowGeneralMovement:true,suggestions:false}).exerciseId)return null;
 const normalized=normalizeImportExerciseName(name);
 if(!normalized)return {category:'missing-name',he:'שם התרגיל חסר. בדקו את מיפוי העמודות ואת שורת המקור. השורה נשמרת לבדיקה ואינה נמחקת אוטומטית.',en:'Exercise name is missing. Check the column mapping and source row. The row remains for review and is not silently removed.',candidateIds:[]};
 if(/^(?:legs?|רגליים) [12]$/.test(normalized))return {category:'heading',he:'זו עשויה להיות כותרת אימון. בדקו ודלגו במפורש אם אינה שורת תרגיל.',en:'This may be a workout heading. Review and explicitly skip it if it is not an exercise row.',candidateIds:[]};
 if(/[?？]|(?:^|\s)(?:או|or)(?:\s|$)/i.test(name))return {category:'uncertain',he:'שם המקור כולל שאלה או חלופות. נדרש אישור המאמן לפני בחירת תרגיל.',en:'The source name contains a question or alternatives. Coach confirmation is needed before selecting an exercise.',candidateIds:[]};
 if(/(?:^|\s)(?:צריך|צריכה|צריכים|צריכות)(?:\s|$)/.test(name))return {category:'instruction',he:'הטקסט עשוי להיות הנחיה ולא שם תרגיל. בדקו את המקור והזינו שם או דלגו במפורש.',en:'This text may be an instruction rather than an exercise name. Check the source and enter a name or explicitly skip the row.',candidateIds:[]};
 const rule=byName.get(key(name));if(!rule)return null;
 return {category:rule.category,he:rule.he,en:rule.en,candidateIds:(rule.candidateIds??[]).filter(id=>catalog.some(e=>e.id===id))};
}

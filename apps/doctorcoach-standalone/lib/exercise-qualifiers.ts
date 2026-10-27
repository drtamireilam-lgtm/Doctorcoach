/** Qualifiers are evidence, never a license to infer a missing implement.
 * Token matching still requires every input token in a verified literal name.
 * Unknown words, negation and alternative lists therefore cannot auto-assign. */
const selectors={
 equipment:{
  dumbbell:/\b(?:db|dumbbells?|dumbell)\b|ד[אמ]*בלים|ד[אמ]*בל|משקולות יד/,
  barbell:/\b(?:bb|barbells?|barbel)\b|(?:^|\s)(?:במוט|מוט|ברבל)(?:\s|$)/,
  cable:/\b(?:cables?|pulley)\b|כבל|כבלים|פולי/,
  machine:/\bmachine\b|מכונ[הת]|מכשיר/,
  smith:/\bsmith\b|סמית|סמיט|סמיית/,
  band:/\b(?:band|banded|elastic)\b|גומ[יי]*ה|גומייה/,
 },
 angle:{incline:/\b(?:incline|inclined)\b|שיפוע חיובי|שיפוע עליון|אינקליין/,flat:/\b(?:flat|horizontal)\b|שטוח|אופקי[ת]?/,decline:/\bdecline\b|שיפוע שלילי|דקליין/},
 grip:{narrow:/\b(?:narrow|close)\s*grip\b|אחיזה צרה|גריפ צר/,wide:/\bwide\s*grip\b|אחיזה רחבה|גריפ רחב/,neutral:/\bneutral\b|ניטרלי/,supinated:/\b(?:supinated|underhand)\b|סופינציה|אחיזה תחתית/,pronated:/\b(?:pronated|overhand)\b|פרונציה|אחיזה עילית/},
 laterality:{unilateral:/\b(?:single|one)\s*(?:arm|leg|hand|limb)|\bunilateral\b|יד אחת|רגל אחת|חד צדד|חד רגל/,bilateral:/\bbilateral\b|שתי ידיים|שתי רגליים|דו צדדי/},
 side:{left:/\bleft\b|שמאל/,right:/\bright\b|ימין/},
 position:{standing:/\bstanding\b|בעמידה/,seated:/\b(?:seated|sitting)\b|בישיבה/,supine:/\bsupine\b|שכיבה על הגב/,prone:/\bprone\b|שכיבה על הבטן/,sideLying:/\bside lying\b|שכיבת צד|שכיבה על הצד/},
 movement:{press:/\bpress(?:es|ing)?\b|לחיצ[הת]|לחיצות/,row:/\brow(?:s|ing)?\b|חתיר[הת]|חתירות/,curl:/\bcurls?\b|כפיפ[הת]/,raise:/\braises?\b|הרמ[הת]|הרמות/,extension:/\bextension\b|פשיט[הת]/,abduction:/\babduction\b|הרחק[הת]/,adduction:/\badduction\b|קירוב/,squat:/\bsquats?\b|סקוואט|סקווט/,hinge:/\b(?:hinge|deadlift)\b|דדליפט|דד ליפט/},
} as const;
export function parseExerciseQualifiers(value:string){
 const text=value.normalize('NFKC').toLowerCase().replace(/[\u0591-\u05c7]/g,'').replace(/[‐‑–—_-]/g,' ');
 const result=Object.fromEntries(Object.entries(selectors).map(([key,values])=>[key,Object.entries(values).filter(([,pattern])=>pattern.test(text)).map(([label])=>label)])) as {[K in keyof typeof selectors]:string[]};
 // A Smith machine is both Smith and machine; a cable machine is cable and
 // machine. A barbell in a Smith is allowed, but explicitly "free" contradicts it.
 const explicitEquipment=result.equipment.filter(e=>!['machine','barbell'].includes(e));
 const competingImplements=explicitEquipment.length>1||result.equipment.includes('barbell')&&explicitEquipment.some(e=>e!=='smith');
 const machineBarbell=result.equipment.includes('machine')&&result.equipment.includes('barbell')&&!result.equipment.includes('smith');
 const freeSmith=result.equipment.includes('smith')&&(/\bfree\b|חופשי/.test(text));
 const positionConflict=result.position.includes('standing')&&result.position.some(p=>p!=='standing')||result.position.includes('seated')&&result.position.some(p=>p!=='seated')||result.position.includes('supine')&&result.position.includes('prone');
 return {...result,conflict:competingImplements||machineBarbell||freeSmith||result.angle.length>1||result.grip.length>1||result.laterality.length>1||result.side.length>1||positionConflict};
}

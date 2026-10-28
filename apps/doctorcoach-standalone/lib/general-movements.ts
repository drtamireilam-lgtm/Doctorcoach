// General movement records preserve unspecified implements. Existing variant IDs
// remain unchanged; these are distinct parent movements, not renamed variants.
const rows=[
 ['squat','סקוואט','Squat','רגליים',['squats']],
 ['chest-press','לחיצת חזה','Chest Press','חזה',['Bench Press']],
 ['leg-curl','כפיפת ברכיים','Leg Curl','רגליים',['leg curls','Hamstring Curl','כפיפת ברך']],
 ['calf-raise','הרמת עקבים','Calf Raise','רגליים',['Calves','Calf Raises']],
 ['shrug','משיכת כתפיים','Shrug','גב',['Shrugs']],
 ['pullover','פולאובר','Pullover','גב',[]],
 ['upright-row','חתירה אנכית','Upright Row','כתפיים',['upright rows']],
 ['overhead-press','לחיצת כתפיים','Overhead Press','כתפיים',['over head press','overheard press']],
 ['bent-over-row','חתירה בהטיית גו','Bent Over Row','גב',['bent over rows']],
 ['lateral-raise','הרחקת כתפיים','Lateral Raise','כתפיים',['lateral raises']],
 ['rear-delt-fly','פרפר הפוך','Rear Delt Fly','כתפיים',['rear delt flys']],
 ['rear-delt-row','חתירה לכתף אחורית','Rear Delt Row','כתפיים',['rear delt rows']],
 ['side-crunch','כפיפת גו צידית','Side Crunch','ליבה',['side crunches']],
 ['kelso-shrug','קלסו שראג','Kelso Shrug','גב',['Kelso Shrugs','calso shrugs','קלסו שראגס']],
 ['hammer-pulldown-narrow','משיכה עליונה במכונת המר באחיזה צרה','Narrow Grip Hammer Pulldown','גב',['narrow grip hammer pulldown','משיכה עליונה בהמר באחיזה צרה','משיכה עליונה בהאמר באחיזה צרה']],
 ['hammer-row-wide','חתירה במכונת המר באחיזה רחבה','Wide Grip Hammer Row','גב',['wide grip hammer rows','חתירה בהמר באחיזה רחבה','חתירה בהאמר באחיזה רחבה']],
] as const;
export const generalMovements=rows.map(([id,name,en,group,aliases])=>({id:'movement-'+id,name,en,aliases:[...aliases],group,area:group,kind:'רגיל',level:'בינוני',symbol:'＋',dose:'לפי התוכנית האישית',desc:id==='kelso-shrug'?'קירוב השכמות בתמיכת הגו; יש לשמור על תנועת השכמה ולא להפוך את התרגיל לחתירה במרפקים.':'התנועה נשמרת כפי שנכתבה בתוכנית. ניתן לציין ציוד ומכשיר בהערות התרגיל.',cues:[] as string[],injuries:[] as string[],easier:'לפי הנחיית המאמן',harder:'לפי הנחיית המאמן',primary:'',secondary:''}));

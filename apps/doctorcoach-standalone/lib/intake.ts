import {TrainingError,isRecord} from './training.ts';
import {textField,integerField} from './care.ts';
import questionnaire from './prepared/intake-questions.json' with {type:'json'};
export const CONSENT_REVISION='2026-09-28.1';
export const consents=[
 {id:'terms',title:'שימוש ב־DoctorCoach',required:true,text:'DoctorCoach מאפשרת לימוד, תיעוד וליווי אישי. התוכן הכללי אינו אבחנה או אישור לפעילות. תוכנית אישית והתקדמות בשיקום נקבעות עם אנשי המקצוע. אין מענה חירום דרך האתר.'},
 {id:'privacy',title:'פרטיות ושמירת הנתונים',required:true,text:'פרטי החשבון, השאלונים, הדיווחים וההודעות נשמרים בחשבון שלך כדי לספק את השירות. הגישה מוגבלת לך ולאנשי הצוות שהרשית, לפי תפקידם. ניתן לעדכן פרטים, להפסיק שיתוף ולבקש עותק או מחיקה באזור הפרטיות. לבירור: ד״ר תמיר עילם, 0546753959.'},
 {id:'health',title:'שמירת מידע רפואי',required:true,text:'אני מסכים/ה לשמירה ולעיבוד של המידע הרפואי שאזין לצורך הערכה, מעקב והתאמת הליווי. הצוות הרפואי המורשה יוכל לקרוא את השאלון; אנשי האימון והתזונה יראו רק את התחומים וההגבלות הרלוונטיים לתפקידם.'},
 {id:'team',title:'שיתוף עם הצוות המוצג',required:true,text:'אני מאשר/ת שיתוף עם אנשי הצוות הפעילים המופיעים כאן: רפואה — מידע רפואי; אימון — מטרות, מגבלות ותוכנית; תזונה — נתוני תזונה; תיאום — שם, טלפון ותורים בלבד. אפשר להפסיק את השיתוף בתיק האישי. הרשאת ניהול לבדה אינה הרשאה למידע רפואי.'},
 {id:'media',title:'תמונות וסרטונים למעקב',required:false,text:'אפשר להעלות תמונות וסרטונים פרטיים לבדיקת הצוות. הסכמה זו אינה אישור לפרסום. פרסום שיווקי דורש הסכמה נפרדת.'},
 {id:'notifications',title:'עדכונים בתוך האפליקציה',required:false,text:'הצגת מונה הודעות, תורים ותזכורות למעקב בתוך החשבון. אין שליחת דוא״ל או התראות למכשיר מכוח הסכמה זו.'},
 {id:'push',title:'התראות לטלפון כשהאפליקציה סגורה',required:false,text:'אני מאשר/ת התראות שירות כלליות לטלפון על עדכונים בחשבון. הפעלה דורשת גם אישור נפרד במכשיר. DoctorCoach שומרת כתובת רישום למכשיר המשויכת לחשבון, ופונה לשירות ההתראות של הדפדפן. ההתראה אינה מכילה תוכן רפואי או הודעות מהצוות; התוכן זמין לאחר כניסה לחשבון. ניתן לבטל כאן או בהגדרות המכשיר. אין בכך אישור לדוא״ל או לפרסום שיווקי.'},
] as const;
export const safetyFlags=[
 {id:'progressive_weakness',label:'חולשה חדשה או שמחמירה במהירות',urgency:'urgent'},
 {id:'bowel_bladder',label:'שינוי חדש בשליטה על שתן/צואה או אובדן תחושה במפשעה',urgency:'emergency'},
 {id:'major_trauma',label:'חבלה משמעותית או חשד לשבר',urgency:'urgent'},
 {id:'fever_hot_joint',label:'מפרק חם ונפוח, עם או בלי חום',urgency:'urgent'},
 {id:'chest_breathing',label:'כאב בחזה או קוצר נשימה חדש או חריג',urgency:'emergency'},
 {id:'vascular',label:'שינוי פתאומי בצבע או בחום הגפה, או נפיחות חריגה',urgency:'urgent'},
 {id:'weight_loss',label:'ירידה לא מוסברת במשקל עם כאב מתמשך',urgency:'review'},
 {id:'night_pain',label:'כאב לילה משמעותי שאינו משתנה עם תנוחה או עומס',urgency:'review'},
 {id:'none',label:'אף אחד מהמצבים האלה',urgency:'none'},
] as const;
export type Answers=Record<string,string|string[]|number>;
export type Review={id:string;clientId:string;flags:string[];urgency:string;state:string;response:string;reviewer:string|null;version:number;createdAt:string;updatedAt:string};
export type Intake={answers:Answers;completed:boolean;tourCompleted:boolean;version:number;updatedAt:string};
export type ConsentState=Record<string,boolean>;
export type OnboardingData={intake:Intake|null;consents:ConsentState;consentRevision:string;reviews:Review[];team:{email:string;name:string;role:string}[];staffRole:string|null;canAdmin:boolean;trainingBlocked:boolean};
export const activeFlags=(a:Answers)=>(Array.isArray(a.red_flags)?a.red_flags:[]).filter(x=>x!=='none');
export function urgency(a:Answers){const f=activeFlags(a);return f.some(id=>safetyFlags.some(s=>s.id===id&&s.urgency==='emergency'))?'emergency':f.some(id=>safetyFlags.some(s=>s.id===id&&s.urgency==='urgent'))?'urgent':f.length?'review':'none';}
export function parseAnswers(value:unknown,complete=false):Answers{
 if(!isRecord(value))throw new TrainingError('פרטי השאלון אינם תקינים.');
 const out:Answers={};
 for(const q of questionnaire.questions){
  const val=value[q.id];if(val===undefined||val===''||val===null)continue;
  if(q.id==='red_flags'){if(!Array.isArray(val)||!val.length||val.some(v=>!safetyFlags.some(f=>f.id===v))||(val.includes('none')&&val.length>1))throw new TrainingError('בחרו סימני אזהרה או ״אף אחד״, ללא שילוב ביניהם.');out[q.id]=[...new Set(val)] as string[];continue;}
  if(q.type==='number'||q.type==='scale'){out[q.id]=integerField(val,q.question,q.min??0,q.max??100);continue;}
  const options=(q.options??[]).map(o=>typeof o==='string'?o:o.value);
  if(q.type.startsWith('multi_select')){if(!Array.isArray(val)||val.length>20||val.some(x=>typeof x!=='string'||!options.includes(x)))throw new TrainingError('בחירה לא תקינה: '+q.question);out[q.id]=[...new Set(val)] as string[];}
  else if(q.type==='single_select'){if(typeof val!=='string'||!options.includes(val))throw new TrainingError('בחירה לא תקינה: '+q.question);out[q.id]=val;}
  else out[q.id]=textField(val,q.question,2000);
 }
 for(const k of ['name','phone','medical_history_other','specific_goals_other','training_style_other','equipment'])if(value[k]!==undefined)out[k]=textField(value[k],k, k==='phone'?30:k==='name'?100:1000);
 if(out.phone&&!/^[+\d()\s-]{7,30}$/.test(String(out.phone)))throw new TrainingError('מספר הטלפון אינו תקין.');
 if(complete){
  for(const id of ['name','age','current_injury','red_flags','medical_history','training_frequency','training_style','specific_goals',...(out.current_injury==='yes'?['body_region','onset','duration','pain_score']:[])])if(out[id]===undefined||out[id]===''||Array.isArray(out[id])&&!out[id].length)throw new TrainingError('יש למלא את שדות החובה בשאלון.');
  if(String(out.name).trim().length<2)throw new TrainingError('יש להזין שם מלא.');
  if(Array.isArray(out.medical_history)&&out.medical_history.includes('אין מחלות רקע משמעותיות')&&out.medical_history.length>1)throw new TrainingError('בחרו מחלות רקע או ללא מחלות רקע, ולא את שתיהן.');
 }
 // A change of injury branch must not preserve a stale current injury.
 if(out.current_injury==='no')for(const k of ['body_region','onset','duration','pain_score','pain_behavior','symptoms','diagnosis','diagnosis_text','imaging','surgery','training_effect','current_management'])delete out[k];
 return out;
}
export function parseConsents(value:unknown){if(!isRecord(value))throw new TrainingError('יש לבחור הסכמות.');const out:ConsentState={};for(const c of consents){if(c.id==='push'&&value[c.id]===undefined){out[c.id]=false;continue;}if(typeof value[c.id]!=='boolean')throw new TrainingError('יש לעבור על ההסכמות.');out[c.id]=value[c.id] as boolean;if(c.required&&!out[c.id])throw new TrainingError('להפעלת החשבון נדרשות הסכמות החובה.');}return out;}
export const asText=(value:unknown)=>Array.isArray(value)?value.join(', '):String(value??'');

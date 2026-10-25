import {generalMovements} from './general-movements.ts';
import {rehabExercises} from './rehab-exercises.ts';
import {gymExercises} from './gym-exercises.ts';
import {stretchExercises} from './stretch-exercises.ts';
const baseExercises = [
  {id:'wall-slide',name:'החלקת ידיים על קיר',en:'Wall slide',area:'כתף',kind:'סביב פציעה',level:'בסיסי',symbol:'↗',dose:'2 × 8–12',desc:'תנועה מבוקרת של השכמה והכתף בטווח נוח.',cues:['גב יציב ונשימה רגועה','להתקדם רק בטווח שמרגיש נשלט'],injuries:['כאב כתף'],easier:'טווח קטן יותר',harder:'הוספת גומייה קלה'},
  {id:'band-er',name:'סיבוב חיצוני עם גומייה',en:'Band external rotation',area:'כתף',kind:'סביב פציעה',level:'בסיסי',symbol:'◌',dose:'2 × 10–15',desc:'עבודה מדורגת על מסובבי הכתף.',cues:['מרפק קרוב לגוף','לא לפצות בתנועת הגב'],injuries:['כאב כתף'],easier:'גומייה קלה יותר',harder:'הגדלת התנגדות בהדרגה'},
  {id:'landmine',name:'לחיצת לנדמיין',en:'Landmine press',area:'כתף',kind:'רגיל',level:'בינוני',symbol:'↗',dose:'3 × 8–10',desc:'וריאציה ללחיצה בזווית אלכסונית.',cues:['שליטה בשכמה','טווח שמאפשר תנועה נוחה'],injuries:['כאב כתף'],easier:'לחיצה ביד אחת במשקל קל',harder:'העלאת משקל מדורגת'},
  {id:'chest-row',name:'חתירה בתמיכת חזה',en:'Chest supported row',area:'גב',kind:'רגיל',level:'בסיסי',symbol:'≋',dose:'3 × 8–12',desc:'משיכה כשהגו נתמך והעומס על הגב התחתון קטן יותר.',cues:['משיכה יציבה','ללא תנופה'],injuries:['כאב גב תחתון','כאב כתף'],easier:'משקל קל יותר',harder:'טווח או עומס גדולים יותר'},
  {id:'bench',name:'לחיצת חזה עם משקולות',en:'Dumbbell bench press',area:'חזה',kind:'רגיל',level:'בינוני',symbol:'↥',dose:'3 × 6–10',desc:'לחיצה אופקית בשליטה.',cues:['מנח נוח לכתף','להימנע מירידה מעבר לטווח הנשלט'],injuries:[],easier:'משקל קל או טווח קצר',harder:'עלייה בעומס'},
  {id:'goblet',name:'סקוואט גביע',en:'Goblet squat',area:'ברך',kind:'רגיל',level:'בסיסי',symbol:'⌄',dose:'3 × 8–10',desc:'דפוס סקוואט עם משקל קדמי.',cues:['עומק לפי שליטה ונוחות','כפות רגליים יציבות'],injuries:['כאב ברך','כאב ירך'],easier:'סקוואט לכיסא',harder:'הגדלת עומק או עומס'},
  {id:'sit-stand',name:'קימה מכיסא',en:'Sit to stand',area:'ברך',kind:'סביב פציעה',level:'בסיסי',symbol:'↥',dose:'2 × 8–12',desc:'תרגול פונקציונלי של כפיפה ויישור ברך.',cues:['קצב מבוקר','בחירת גובה כיסא מתאים'],injuries:['כאב ברך'],easier:'כיסא גבוה',harder:'כיסא נמוך או משקל קל'},
  {id:'step-up',name:'עלייה למדרגה נמוכה',en:'Low step up',area:'ברך',kind:'סביב פציעה',level:'בינוני',symbol:'▥',dose:'2 × 8 לכל צד',desc:'חיזוק מדורג של רגל אחת.',cues:['מדרגה נמוכה בתחילה','ברך נעה בהתאם לשליטה'],injuries:['כאב ברך','כאב ירך'],easier:'מדרגה נמוכה יותר',harder:'גובה או עומס גדולים יותר'},
  {id:'rdl',name:'דדליפט רומני',en:'Romanian deadlift',area:'גב',kind:'רגיל',level:'בינוני',symbol:'↧',dose:'3 × 6–10',desc:'דפוס ציר ירך לחיזוק שרשרת אחורית.',cues:['עמוד שדרה במנח נשלט','התחלה במשקל קל'],injuries:[],easier:'מקל או משקולות קלות',harder:'העלאת עומס מדורגת'},
  {id:'bird-dog',name:'בירד דוג',en:'Bird dog',area:'גב',kind:'סביב פציעה',level:'בסיסי',symbol:'✣',dose:'2 × 6–10 לכל צד',desc:'שליטה בגו ובאגן תוך תנועת גפיים.',cues:['תנועה איטית','אגן יציב'],injuries:['כאב גב תחתון'],easier:'תנועת יד בלבד',harder:'שהייה ארוכה יותר'},
  {id:'dead-bug',name:'דד באג',en:'Dead bug',area:'גב',kind:'סביב פציעה',level:'בסיסי',symbol:'✧',dose:'2 × 6–10 לכל צד',desc:'שליטה מרכזית בזמן תנועת יד ורגל.',cues:['לנשום ברצף','לשמור על טווח נשלט'],injuries:['כאב גב תחתון'],easier:'רגליים בלבד',harder:'הארכת מנוף'},
  {id:'hip-bridge',name:'גשר ישבן',en:'Glute bridge',area:'ירך',kind:'סביב פציעה',level:'בסיסי',symbol:'⌒',dose:'2 × 10–15',desc:'עבודה על פשיטת ירך והפעלת ישבן.',cues:['תנועה מהירך','ללא הקשתת יתר'],injuries:['כאב ירך','כאב גב תחתון'],easier:'טווח קצר',harder:'גרסת רגל אחת'},
  {id:'split-squat',name:'סקוואט מפוצל',en:'Split squat',area:'ירך',kind:'רגיל',level:'בינוני',symbol:'↧',dose:'3 × 8 לכל צד',desc:'חיזוק רגליים בתמיכה א־סימטרית.',cues:['אחיזה לתמיכה במידת הצורך','עומק מותאם'],injuries:['כאב ירך','כאב ברך'],easier:'טווח קצר ותמיכה',harder:'משקל חיצוני'},
  {id:'ecc-calf',name:'הרמות עקב מדורגות',en:'Calf raise',area:'קרסול',kind:'סביב פציעה',level:'בסיסי',symbol:'↥',dose:'2 × 10–15',desc:'חיזוק שרירי השוק בטווח נוח.',cues:['עלייה וירידה מבוקרות','להיעזר במעקה לשיווי משקל'],injuries:['כאב קרסול'],easier:'בשתי רגליים ובתמיכה',harder:'רגל אחת או עומס קל'},
  {id:'balance',name:'עמידה על רגל אחת',en:'Single leg balance',area:'קרסול',kind:'סביב פציעה',level:'בסיסי',symbol:'◉',dose:'2 × 20–30 שניות',desc:'תרגול שיווי משקל עם תמיכה זמינה.',cues:['קרוב לקיר או מעקה','לשמור על יציבות'],injuries:['כאב קרסול'],easier:'אחיזה במעקה',harder:'משטח מאתגר יותר'},
  {id:'wrist-ext',name:'יישור שורש כף יד',en:'Wrist extension',area:'מרפק',kind:'סביב פציעה',level:'בסיסי',symbol:'↗',dose:'2 × 12–15',desc:'חיזוק מדורג של פושטי שורש כף היד.',cues:['תנועה איטית','עומס התחלתי נמוך'],injuries:['כאב מרפק'],easier:'ללא משקל',harder:'משקולת קלה'},
  {id:'hammer-curl',name:'כפיפת מרפק אחיזה ניטרלית',en:'Hammer curl',area:'מרפק',kind:'רגיל',level:'בינוני',symbol:'↥',dose:'3 × 8–12',desc:'חיזוק זרוע באחיזה ניטרלית.',cues:['מרפק יציב','בלי נדנוד גוף'],injuries:['כאב מרפק'],easier:'משקל קל',harder:'משקל גבוה יותר'},
  {id:'walk',name:'הליכה מדורגת',en:'Graded walking',area:'כללי',kind:'סביב פציעה',level:'בסיסי',symbol:'→',dose:'10–20 דקות',desc:'פעילות אירובית קלה עם התאמת משך וקצב.',cues:['להתחיל בהיקף נסבל','לעקוב אחר התגובה למחרת'],injuries:['כאב גב תחתון','כאב ברך','כאב ירך','כאב קרסול'],easier:'משך קצר יותר',harder:'הגדלה הדרגתית של זמן'},
];

export type Exercise={id:string;name:string;en:string;area:string;group:string;kind:string;level:string;symbol:string;dose:string;desc:string;cues:string[];injuries:string[];easier:string;harder:string;primary:string;secondary:string};
const baseGroups:Record<string,string>={'bench':'חזה','chest-row':'גב','landmine':'כתפיים','band-er':'מסובבי כתף ושכמה','wall-slide':'מסובבי כתף ושכמה','hammer-curl':'יד קדמית','wrist-ext':'אמות ואחיזה','rdl':'רגליים · המסטרינג','goblet':'רגליים · ארבע־ראשי','split-squat':'רגליים · ארבע־ראשי','hip-bridge':'רגליים · ישבן','bird-dog':'ליבה','dead-bug':'ליבה','ecc-calf':'רגליים · שוקיים'};
export const exercises:Exercise[]=[...baseExercises.map(e=>({...e,group:baseGroups[e.id]??e.area,primary:'',secondary:''})),...gymExercises,...rehabExercises,...stretchExercises,...generalMovements];

export const guides=[
 {name:'אגן ומפשעה',icon:'◇',summary:'אפשרויות לחיזוק מקרבי הירך ושליטה באגן, עם התאמה אישית של הטווח והעומס.',avoid:'כאב חד לאחר חבלה או חוסר יכולת לדרוך מחייבים בדיקה לפני תרגול.',ids:['adductor-squeeze','clamshell','cossack-squat-stretch','copenhagen-short-lever','copenhagen-long-lever','hip-bridge']},
  {name:'כאב כתף',icon:'↗',summary:'התאמת טווח, זווית ואחיזה בתרגילי דחיפה ומשיכה.',avoid:'כאב חד אחרי טראומה, חולשה חדשה או תחושת פריקה מצריכים הערכה.',ids:['wall-slide','band-er','chest-row','landmine']},
  {name:'כאב ברך',icon:'⌄',summary:'בחירת עומק סקוואט, גובה מדרגה ועומס שמתאימים לתגובה.',avoid:'נעילת ברך, נפיחות משמעותית או אי יכולת לדרוך מצריכים הערכה.',ids:['sit-stand','goblet','step-up','walk']},
  {name:'כאב גב תחתון',icon:'≋',summary:'עבודה על תנועה, שליטה בגו והחזרת עומס בהדרגה.',avoid:'חולשה מתקדמת, הפרעה בשליטה על סוגרים או חוסר תחושה באזור האוכף מצריכים טיפול דחוף.',ids:['walk','bird-dog','dead-bug','chest-row']},
  {name:'כאב ירך',icon:'◇',summary:'שליטה בטווח, חיזוק ירך ועומס רגלי מותאם.',avoid:'כאב חריף לאחר נפילה או חוסר יכולת לשאת משקל מצריכים הערכה.',ids:['hip-bridge','goblet','split-squat','walk']},
  {name:'כאב מרפק',icon:'◌',summary:'התאמת אחיזה, נפח ועומס במשיכות ובכפיפות מרפק.',avoid:'עיוות, נפיחות חדה או חולשה פתאומית אחרי מאמץ מצריכים הערכה.',ids:['wrist-ext','hammer-curl','chest-row']},
  {name:'כאב קרסול',icon:'▥',summary:'שיווי משקל, חיזוק שוק וחזרה הדרגתית לתנועה.',avoid:'עיוות, נפיחות משמעותית או קושי לדרוך מצריכים הערכה.',ids:['balance','ecc-calf','walk']},
];

export const templates=[
  {id:'upper',name:'פלג גוף עליון',tag:'4 תרגילים',text:'משיכה, דחיפה ושליטה בכתף.',ids:['wall-slide','band-er','chest-row','bench']},
  {id:'lower',name:'פלג גוף תחתון',tag:'4 תרגילים',text:'דפוסי ברך, ירך ושיווי משקל.',ids:['goblet','step-up','hip-bridge','balance']},
  {id:'general',name:'אימון כללי מתון',tag:'4 תרגילים',text:'תנועה כללית וחיזוק בסיסי.',ids:['walk','bird-dog','sit-stand','chest-row']},
];


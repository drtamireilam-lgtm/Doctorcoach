export type ProductionExercise={id:string;name:string;en:string;group:string;desc:string;cues:string[]};
type ProductionVideo={exerciseId:string;kind:string;status:string;published:boolean};
export type DemoCoverage<T extends ProductionExercise=ProductionExercise>={exercise:T;state:'published'|'draft'|'missing';published:number;drafts:number};
export function demoCoverage<T extends ProductionExercise>(catalog:T[],videos:ProductionVideo[]):DemoCoverage<T>[] {
 const counts=new Map<string,{published:number;drafts:number}>();
 for(const video of videos){if(video.kind!=='demo'||video.status!=='ready')continue;const entry=counts.get(video.exerciseId)??{published:0,drafts:0};if(video.published)entry.published++;else entry.drafts++;counts.set(video.exerciseId,entry);}
 return catalog.map(exercise=>{const count=counts.get(exercise.id)??{published:0,drafts:0};return {exercise,...count,state:count.published?'published':count.drafts?'draft':'missing'};});
}
export function filmingBrief(rows:DemoCoverage[]):string {
 const intro=['# DoctorCoach — תדריך צילום תרגילים','',
 'תדריך המבוסס על ספריית התרגילים ועל רשימת הסרטונים שנטענה. מצב הסרטון אינו אישור קליני. יש לבדוק את הביצוע והתוכן עם איש המקצוע לפני פרסום.',
 '', '## הנחיות צילום משותפות',
 '- סרטון הדגמה לכל תרגיל, עם שם התרגיל בתחילתו.',
 '- צילום אופקי, מצלמה יציבה, תאורה אחידה ורקע נקי; הגוף והציוד נשארים בפריים לכל אורך התנועה.',
 '- צלמו מנח התחלה, מספר חזרות מבוקרות ומנח סיום. בחרו עומס להדגמה עם המאמן; אין להציג את מספר החזרות או המשקל כמינון אישי.',
 '- צלמו זווית נוספת אם הזווית הראשית מסתירה את התנועה, וקטע קרוב לדגש רלוונטי. המאמן יבחר אילו קטעים נכנסים לסרטון הסופי.',
 '- הוסיפו כתוביות קצרות מהדגשים הרשומים לתרגיל; טיוטת הקריינות למטה טעונה בדיקת איש המקצוע.',
 '- העלאה לאפליקציה: MP4 או WebM, עד 25 MB לקובץ. שמרו בנפרד גם את קובץ המקור האיכותי.',
 '- לפני פרסום: לבדוק ניגון, התאמה לתרגיל, כתוביות, זכויות צילום והיעדר מידע פרטי של מתאמנים.',
 ''];
 const labels={published:'פורסם',draft:'טיוטה מוכנה',missing:'אין סרטון מוכן ברשימה שנטענה'};
 for(const {exercise:e,state,published,drafts} of rows)intro.push(`## ${e.name} / ${e.en}`,`מזהה התרגיל: ${e.id}`,`קבוצת שרירים: ${e.group}`,`מצב ברשימה שנטענה: ${labels[state]} · ${published} פורסמו · ${drafts} טיוטות`,'',`תיאור קיים: ${e.desc}`,'','דגשים קיימים:',...e.cues.map(c=>`- ${c}`),'',`טיוטת קריינות: ״${e.name}. ${e.desc} ${e.cues.join('. ')}.״`,`שם קובץ מומלץ: ${e.id}-demo.mp4`,'');
 return intro.join('\n');
}

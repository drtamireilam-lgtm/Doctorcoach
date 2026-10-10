import {TrainingError} from './training.ts';
export async function requireTrainingAllowed(db:D1Database,userId:string){
 const review=await db.prepare("SELECT id FROM medical_reviews WHERE client_id=? AND state IN ('pending','in_review') LIMIT 1").bind(userId).first();
 if(review)throw new TrainingError('ממתינה בדיקה רפואית. אפשר ללמוד ולעדכן את הצוות; פתיחת אימון ושינוי תוכנית יתאפשרו לאחר מענה הרופא.',403);
 const intake=await db.prepare('SELECT completed FROM user_intakes WHERE user_id=?').bind(userId).first<{completed:number}>();
 if(!intake?.completed)throw new TrainingError('יש לסיים את שאלון ההיכרות לפני יצירת תוכנית או פתיחת אימון.',403);
}

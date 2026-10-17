'use client';
import {Check,ArrowLeft,ArrowRight,ClipboardList,HeartPulse,Play} from 'lucide-react';
import {StartButton} from './training-workspace';
import {HomeActivitySummary} from './home-activity-summary';
import {homeWorkoutPreview} from '../lib/home-workout';
import {workoutDayLabel} from '../lib/workout-days';
import {useLanguage} from './language-provider';
import {traineeNextStep,type TraineeNextStep} from '../lib/trainee-next-step';
import type {OnboardingData} from '../lib/intake';
import type {TrainingController} from '../hooks/use-training';
const copy:Record<TraineeNextStep,[string,string,string,string,string,string,string]>={
 profile:['נכיר אותך לפני שמתחילים','Let’s get to know you','השלימו פרטים, שאלון והסכמות. התשובות שכבר נשמרו מחכות לכם בטופס.','Complete your details, questionnaire and consents. Previously saved answers are kept in the form.','להשלמת הפרטים והשאלון','Complete my questionnaire','onboarding'],
 medical:['ממתינים לבדיקה רפואית','Waiting for medical review','בקשת הבדיקה נשמרה. אפשר לפנות לצוות; פתיחת אימון חדש ממתינה לבירור.','Your review request is saved. You can contact the team while starting a new workout is on hold.','יצירת קשר עם הצוות','Contact the team','messages'],
 build:['בונים את התוכנית שלך','Build your program','המסלול העצמאי שלך פעיל. בחרו חלוקת אימונים והוסיפו תרגילים בתוכנית שלי.','Your self-training access is active. Choose a split and add exercises in My program.','לבניית התוכנית','Build my program','plan'],
 waiting:['התוכנית שלך בדרך','Your program is next','אם כבר הצטרפתם למאמן, התוכנית תופיע אחרי שיקצה אותה. עוד לא התחברתם? השתמשו בהזמנה מהמאמן, או פנו לצוות.','If you have joined a coach, your program will appear after they assign it. Otherwise, use your coach’s invitation or contact the team.','לצוות ולתיאום ליווי','Contact the team','contact'],
 access:['בחרו איך להתקדם','Choose how to continue','אין כרגע הרשאה פעילה לאימון במסלול העצמאי. אפשר לבדוק את המסלול או לפנות לצוות לגבי ליווי.','Self-training access is currently inactive. Check your membership or contact the team about coaching.','לבדיקת המסלול שלי','Check my membership','membership'],
 start:['האימון הבא שלי','My next workout','התוכנית מוכנה. אפשר להתחיל כאן, לאחר בדיקת המוכנות ובחירת האימון.','Your program is ready. Start here after checking readiness and selecting your workout.','לפתיחת התוכנית','Open my program','plan'],
 resume:['האימון שלך מחכה לך','Your workout is waiting','יש אימון פתוח בחשבון. המשיכו ממנו במקום לפתוח אימון נוסף.','There is an active workout in your account. Continue it instead of starting another one.','להמשך האימון','Continue workout','workout'],
 ready:['האימון הבא שלי','My next workout','ממשיכים מהתוכנית שלך. לפני ההתחלה נבדוק מוכנות ונבחר את האימון.','Continue with your program. Check readiness and choose your workout before starting.','לתוכנית שלי','My program','plan'],
};
export function TraineeStart({controller,data,loading,status,retry,go}:{controller:TrainingController;data:OnboardingData|null;loading:boolean;status:number;retry:()=>void;go:(s:string)=>void}){
 const en=useLanguage().language==='en',Arrow=en?ArrowRight:ArrowLeft;
 if(loading||controller.auth==='loading')return <section className="panel trainee-start" dir={en?'ltr':'rtl'} role="status"><p>{en?'Checking your next step…':'בודקים מה הצעד הבא שלך…'}</p></section>;
 if(!data||status!==200||controller.auth!=='ready'||!controller.access)return <section className="panel trainee-start" dir={en?'ltr':'rtl'}><h2>{en?'Your next step':'הצעד הבא שלך'}</h2><p role="status">{en?'We could not check your current progress. Try refreshing your data.':'לא הצלחנו לבדוק את ההתקדמות כרגע. נסו לרענן את הנתונים.'}</p><button className="button secondary" onClick={retry}>{en?'Try again':'ניסיון נוסף'}</button></section>;
 const state=traineeNextStep({onboarding:data,access:controller.access,planCount:controller.plan.length,active:!!controller.feed.active,completedWorkouts:controller.feed.stats.total});
 const c=copy[state.next],done=state.profile&&state.program&&state.firstWorkout;
 const canTrain=['start','ready','resume'].includes(state.next);
 const preview=homeWorkoutPreview(controller.plan,controller.feed.history,controller.access.mode,controller.workoutPreference.mode,controller.access.programId??null);
 const dayLabel=preview.day?(controller.access.mode==='self'?controller.split?.days.find(d=>d.id===preview.day)?.label:undefined)??workoutDayLabel(preview.day):null;
 const steps=[[en?'Details & questionnaire':'פרטים ושאלון',state.profile],[en?'Personal program':'תוכנית אישית',state.program],[en?'First completed workout':'אימון ראשון שהושלם',state.firstWorkout]] as const;
 const list=<ol className="trainee-start-steps">{steps.map(([label,complete],i)=><li key={i} data-complete={complete}><span className="trainee-step-number" aria-hidden="true">{complete?<Check size={17}/>:i+1}</span><span>{label}<small>{complete?(en?'Completed':'הושלם'):(en?'Not completed yet':'טרם הושלם')}</small></span></li>)}</ol>;
 return <><section className="panel trainee-start" dir={en?'ltr':'rtl'} aria-labelledby="trainee-start-title"><span className="eyebrow">{en?'Your next step':'הצעד הבא שלך'}</span><h1 id="trainee-start-title">{en?c[1]:c[0]}</h1><p>{en?c[3]:c[2]}</p>{canTrain&&state.next!=='resume'&&<p className="home-workout-preview">{dayLabel?<><strong data-no-translate>{dayLabel}</strong> · {preview.exercises} {en?'exercises':'תרגילים'} · {preview.sets} {en?'sets':'סטים'}</>:en?'Choose your workout in the start screen.':'בחרו את האימון הרצוי במסך ההתחלה.'}</p>}{state.next==='resume'&&controller.feed.active&&<p>{controller.feed.active.completedSets} / {controller.feed.active.plannedSets} {en?'sets completed':'סטים בוצעו'}</p>}<div className="trainee-start-actions"><>{canTrain?<StartButton controller={controller} go={go} wide/>:<button className="button primary" onClick={()=>go(c[6])}>{state.next==='medical'?<HeartPulse size={19}/>:state.next==='resume'?<Play size={19}/>:<ClipboardList size={19}/>} {en?c[5]:c[4]}<Arrow size={18}/></button>}{canTrain&&<button className="button secondary" onClick={()=>go('plan')}>{en?'View my program':'לצפייה בתוכנית שלי'}</button>}</>{state.next==='waiting'&&<a className="button secondary" href="/coaching#join-coach">{en?'I have a coach invitation':'יש לי הזמנה ממאמן'}</a>}</div>{done?<details><summary>{en?'Getting started — completed':'שלבי ההתחלה — הושלמו'}</summary>{list}</details>:list}</section><HomeActivitySummary controller={controller} go={go}/></>;
}

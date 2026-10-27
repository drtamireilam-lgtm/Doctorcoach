'use client';
import {allowProgramDraftLeave} from '../lib/program-draft-navigation';
import {useCustomExercises} from '../hooks/use-custom-exercises';
import type {CustomExercise} from '../lib/custom-exercise-types';
import {TeamProfiles} from '../components/team-profiles';
import {feedbackRegion} from '../lib/feedback-topics';
import {Localize, LanguageToggle, useLanguage} from "../components/language-provider";
import {ThemeToggle} from '../components/theme-provider';
import {translateText} from '../lib/localization';
import {recoveryTarget} from '../lib/recovery-navigation';
import {InjuryFile} from '../components/injury-file';
import {MembershipWorkspace} from '../components/membership-workspace';
import { useCallback, useEffect, useRef, useState } from 'react';
import {workoutNavigation} from '../lib/workout-navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, Dumbbell, HeartPulse, Home, History, Menu, Play, Settings2, ShieldCheck, UserRound, Users, Film, X } from 'lucide-react';
import { guides } from '../lib/content';
import { ExerciseLibrary, FavoriteButton } from '../components/exercise-library';
import { InjuryWorkspace } from '../components/injury-workspace';
import { CareWorkspace, TeamWorkspace } from '../components/care-workspace';
import { VideoWorkspace } from '../components/video-workspace';
import { AppointmentsWorkspace } from '../components/appointments-workspace';
import { AppInstall } from '../components/app-install';
import { WhatsAppBooking } from '../components/whatsapp-booking';
import {HowItWorks,MoreArea,AreaNavigation,AreaMobileNav,HomeIntroduction,ContactArea,SettingsArea} from '../components/site-areas';
import { useTraining } from '../hooks/use-training';
import { TrainingDashboard, PlanWorkspace, WorkoutWorkspace, HistoryWorkspace } from '../components/training-workspace';
import { ConsultationWorkspace, ServiceAdminWorkspace } from '../components/service-workspace';
import { WellnessWorkspace, NutritionPricing } from '../components/wellness-workspace';
import { FeedbackWorkspace, FeedbackButton, StoriesWorkspace } from '../components/community-workspace';
import { LearningArea } from '../components/learning-area';
import { useStaffAccess } from '../hooks/use-services';

import {careRequest,useCareResource} from '../hooks/use-care';
import type {OnboardingData} from '../lib/intake';
import {LaunchSplash,OnboardingFlow} from '../components/onboarding-workspace';
import {NotificationBell} from '../components/notification-bell';
import {MessagesWorkspace,PrivacyWorkspace,TeamDashboard} from '../components/core-workspaces';

import {NavigationTour} from '../components/navigation-tour';
import {TraineeStart} from '../components/trainee-start';
import {isSimpleTrainee,traineeAreas,areaFor,staffDestinations} from '../lib/mobile-navigation';

type Section = 'contact'|'settings'|'onboarding'|'membership'|'home'|'library'|'injuries'|'plan'|'workout'|'history'|'consult'|'pro'|'admin'|'care'|'team'|'videos'|'appointments'|'nutrition'|'recovery'|'feedback'|'learn'|'stories'|'messages'|'privacy'|'dashboard'|'more'|'readiness';
const nav: {id: Section; label: string; icon: typeof Home}[] = [
  {id:'contact',label:'יצירת קשר',icon:Users},{id:'settings',label:'הגדרות וחשבון',icon:Settings2},{id:'more',label:'עוד',icon:Menu},{id:'readiness',label:'מוכנות לאימון',icon:HeartPulse},{id:'home',label:'סקירה כללית',icon:Home},{id:'onboarding',label:'היכרות ושאלון',icon:ClipboardList},{id:'library',label:'ספריית תרגילים',icon:Dumbbell},{id:'injuries',label:'אימון סביב פציעה',icon:HeartPulse},{id:'plan',label:'התוכנית שלי',icon:ClipboardList},{id:'membership',label:'מסלול ומנוי',icon:ShieldCheck},{id:'workout',label:'אימון פעיל',icon:Play},{id:'history',label:'היסטוריה והתקדמות',icon:History},{id:'nutrition',label:'תזונה ומדידות',icon:ClipboardList},{id:'recovery',label:'שיקום ומוכנות',icon:HeartPulse},{id:'learn',label:'אנטומיה ולמידה',icon:Film},{id:'feedback',label:'משוב והצעות',icon:Users},{id:'stories',label:'סיפורי התקדמות',icon:History},{id:'care',label:'התיק האישי',icon:UserRound},{id:'messages',label:'הודעות לצוות',icon:Users},{id:'privacy',label:'פרטיות והסכמות',icon:ShieldCheck},{id:'dashboard',label:'לוח הצוות',icon:ClipboardList},{id:'appointments',label:'התורים שלי',icon:CalendarDays},{id:'videos',label:'סרטוני הדרכה',icon:Film},{id:'team',label:'ניהול מתאמנים',icon:Users},{id:'consult',label:'ייעוץ וליווי',icon:CalendarDays},{id:'pro',label:'לאנשי מקצוע',icon:UserRound},{id:'admin',label:'ניהול שירותים',icon:Settings2}
];
function Brand({compact=false}:{compact?:boolean}) {return <Localize>{<div className={`brand ${compact?'brand-compact':'brand-full'}`}><img className="brand-art" src="/branding/doctorcoach-drc-v1.webp" width={compact?40:176} height={compact?40:176} alt="DoctorCoach"/>{!compact&&<small className="brand-tagline">להמשיך לנוע. בצורה חכמה.</small>}</div>}</Localize>}
export default function HomePage(){
 const customCatalog=useCustomExercises();const exById=new Map(customCatalog.exercises.map(e=>[e.id,e]));
  const {language}=useLanguage();
  const navigation=useRef(workoutNavigation());
  const onWorkoutDraftChange=useCallback((dirty:boolean)=>navigation.current.setDirty(dirty),[]);
  const confirmLeave=()=>window.confirm(translateText('יש ערכים בסטים שטרם נשמרו. יציאה מהאימון תמחק את השינויים האלה. לצאת בכל זאת?',language));
  const [recovery,setRecovery]=useState(()=>recoveryTarget(''));
  const [section,setSection]=useState<Section>('home'); const [selected,setSelected]=useState<string|null>(null); const [menu,setMenu]=useState(false); const [injury,setInjury]=useState(guides[0].name);
  useEffect(()=>{
    if(!menu)return;
    const previous=document.activeElement as HTMLElement|null;
    const sidebar=document.getElementById('site-sidebar');
    const focusable=()=>Array.from(sidebar?.querySelectorAll<HTMLElement>('button,a[href]')??[]).filter(el=>el.offsetParent!==null);
    focusable()[0]?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setMenu(false);}
      if(event.key==='Tab'){
        const items=focusable(),first=items[0],last=items[items.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);previous?.focus({preventScroll:true});};
  },[menu]);
  const controller = useTraining();
  const staff = useStaffAccess();
  const onboarding=useCareResource<OnboardingData>('/api/onboarding');
  const [flowChecked,setFlowChecked]=useState(false);const [tour,setTour]=useState(false);
  useEffect(()=>{if(flowChecked||onboarding.loading)return;if(onboarding.status===401||onboarding.data){setFlowChecked(true);}},[onboarding.data,onboarding.status,onboarding.loading,flowChecked]);
  const { plan, auth, busy, notice: toast, add } = controller;
  useEffect(() => {
    const syncSection = () => {
      if(!navigation.current.accept(window.location.hash,confirmLeave)){
        window.history.replaceState(null,'',window.location.pathname+window.location.search+navigation.current.current());
        return;
      }
      const hash = window.location.hash.slice(1).split('?')[0];
      setRecovery(recoveryTarget(window.location.hash));
      setSection(nav.some(n => n.id === hash) ? hash as Section : 'home');
      setSelected(null);
      setMenu(false);
    };
    syncSection();
    window.addEventListener('popstate', syncSection);
    window.addEventListener('hashchange', syncSection);
    return () => { window.removeEventListener('popstate', syncSection); window.removeEventListener('hashchange', syncSection); };
  }, []);
  const go=(s:Section)=>{if(window.location.hash!=='#'+s&&!allowProgramDraftLeave())return;if(!navigation.current.accept('#'+s,confirmLeave))return;if(window.location.hash !== '#'+s) window.history.pushState(null,'','#'+s);setRecovery(recoveryTarget('#'+s));setSection(s);setSelected(null);setMenu(false);window.scrollTo({top:0,behavior:'smooth'})};
  const simpleTrainee=isSimpleTrainee({auth,staffAccess:staff.access,staffRole:staff.careRole??onboarding.data?.staffRole,canAdmin:onboarding.data?.canAdmin,completed:onboarding.data?.intake?.completed});
  const visibleNav=traineeAreas.map(a=>({...a,icon:nav.find(n=>n.id===a.id)!.icon}));
  const staffLinks=staffDestinations(staff);
  const staffNav=nav.filter(n=>staffLinks.includes(n.id));

  return <Localize>{<div className={`app-shell ${simpleTrainee?'trainee-simple':''}`} dir="rtl"><aside id="site-sidebar" className={`sidebar ${menu?'open':''}`}><div className="sidebar-top"><Brand/><button className="mobile-close" aria-label="סגירת תפריט" onClick={()=>setMenu(false)}><X size={20}/></button></div><LanguageToggle className="sidebar-language-toggle"/><div className="side-label">שבעת האזורים שלך</div><nav aria-label="ניווט ראשי">{visibleNav.map(n=><button key={n.id} onClick={()=>go(n.id)} aria-current={section!=='more'&&areaFor(section)===n.id?'page':undefined} className={`nav-link ${section!=='more'&&areaFor(section)===n.id?'active':''}`}><n.icon size={19} strokeWidth={1.8}/><span>{n.label}</span>{n.id==='plan'&&plan.length>0&&<em>{plan.length}</em>}</button>)}</nav>{staffNav.length>0&&<><div className="side-label">סביבת הצוות</div><nav aria-label="כלי צוות">{staffNav.map(n=><button key={n.id} className={`nav-link ${section===n.id?'active':''}`} onClick={()=>go(n.id)}><n.icon size={19}/><span>{n.label}</span></button>)}</nav></>}<div className="sidebar-foot"><div className="side-support"><div className="support-icon"><ShieldCheck size={20}/></div><strong>מתקדמים בקצב שלך</strong><p>אימון מותאם מתחיל בהקשבה לגוף ובבחירה מודעת של העומס.</p><button onClick={()=>go('pro')}>לפגוש את הצוות <ArrowLeft size={15}/></button></div><div className="side-credit">{auth==='ready'&&<a href="/signout-with-chatgpt?return_to=%2F" target="_top">יציאה מהחשבון</a>}<button onClick={()=>go('settings')}>הגדרות וחשבון</button><span>© DoctorCoach 2026</span></div></div></aside><div className="main-area"><header className="topbar"><div className="topbar-start"><button className="mobile-menu" aria-label="אזורים נוספים" onClick={()=>go('more')}><Menu size={22}/></button><div className="breadcrumb"><img className="topbar-logo" src="/branding/doctorcoach-drc-v1.webp" alt="" width="36" height="36"/>DoctorCoach <span>/</span> <strong>{traineeAreas.find(n=>n.id===section)?.label??nav.find(n=>n.id===section)?.label}</strong></div></div><div className="topbar-end"><LanguageToggle className="header-language-toggle"/><ThemeToggle/><NotificationBell go={s=>go(s as Section)}/><AppInstall/><span className="topbar-note">המרחב שלך לתנועה חכמה</span><button className="avatar" title="אזור אישי" onClick={()=>go('care')}><UserRound size={20}/></button></div></header><main className={`content view-${section}`}><AreaNavigation section={section} go={s=>go(s as Section)}/>
  {onboarding.data?.trainingBlocked&&<div className="safety-notice" role="status"><HeartPulse size={23}/><div><strong>ממתינה בדיקה רפואית לפני המשך אימון</strong><p>בקשת הבדיקה נשמרה. במקרה חירום פנו לטיפול מיד ואל תמתינו למענה כאן.</p><button className="text-button" onClick={()=>go('messages')}>יצירת קשר עם הצוות</button></div></div>}

  {onboarding.data?.reviews.filter(r=>r.response).slice(0,1).map(r=><div className="note" key={r.id}><strong>{r.reviewer}: </strong>{r.response}</div>)}
  {!['home','contact','settings','onboarding','consult','pro','admin','care','team','appointments','videos','nutrition','recovery','learn','feedback','stories'].includes(section)&&auth==='required'&&<div className="auth-note"><ShieldCheck size={18}/><span>לשמירת מועדפים, תוכנית ומעקב אימונים יש להתחבר לחשבון.</span><a href={`/signin-with-chatgpt?return_to=${encodeURIComponent('/#'+section)}`} target="_top">התחברות <ArrowLeft size={15}/></a></div>}
  {!['home','contact','settings','onboarding','consult','pro','admin','care','team','appointments','videos','nutrition','recovery','learn','feedback','stories'].includes(section)&&auth==='loading'&&<div className="auth-note" role="status">טוענים את התוכנית ואת האימונים שלך…</div>}
  {!['home','contact','settings','onboarding','consult','pro','admin','care','team','appointments','videos','nutrition','recovery','learn','feedback','stories'].includes(section)&&auth==='error'&&<div className="auth-note" role="alert"><span>לא ניתן לטעון את הנתונים כרגע.</span><button className="text-button" disabled={busy} onClick={()=>controller.refresh()}>ניסיון נוסף</button></div>}
  {controller.feed.active && section === 'plan' && <div className="active-workout-strip"><Play size={21}/><div><strong>יש לך אימון בתהליך</strong><span>{controller.feed.active.completedSets} מתוך {controller.feed.active.plannedSets} סטים הושלמו</span></div><button className="button primary" onClick={()=>go('workout')}>להמשך האימון <ArrowLeft size={16}/></button></div>}
  <div hidden={section!=='onboarding'}>{flowChecked&&(onboarding.data||onboarding.status===401)?<OnboardingFlow canBuildProgram={!!controller.access?.canBuild} go={s=>go(s as Section)} hasProgram={!!controller.access?.canStart&&controller.plan.length>0} data={onboarding.data} active={section==='onboarding'} anonymous={onboarding.status===401} onSaved={d=>{onboarding.setData(d);void controller.refresh();}} onClose={()=>go('home')} onTour={()=>setTour(true)}/>:section==='onboarding'?<div className="panel care-empty" role="status">{onboarding.loading?'טוענים את השאלון שלך…':<><p>לא ניתן לטעון את השאלון כרגע.</p><button className="button secondary" onClick={onboarding.reload}>ניסיון נוסף</button></>}</div>:null}</div>
  {section==='library'&&<div hidden={!!selected}><ExerciseLibrary controller={controller} onDetails={setSelected}/></div>}
  {section==='plan'&&auth==='ready'&&<InjuryFile context="plan"/>}
  {section==='onboarding'?null:selected?(()=>{const e=exById.get(selected);if(!e)return <div className="panel"><p>התרגיל אינו זמין כרגע. רעננו את הספרייה או חזרו לתוכנית.</p><button className="button secondary" onClick={()=>setSelected(null)}>חזרה</button></div>;return <><button className="back-link" onClick={()=>setSelected(null)}><ArrowRight size={17}/> חזרה</button><div className="page-heading"><span className="eyebrow">מדריך תרגילים / {e.area}</span><h1>{e.name}</h1><p>{e.en}</p></div><div className="detail-grid"><div className="panel detail-main"><div className="detail-visual">{e.symbol}<span>{e.kind}</span></div><VideoWorkspace kind="demo" exerciseId={e.id}/>{(e as CustomExercise).videoUrl&&<a href={(e as CustomExercise).videoUrl} target="_blank" rel="noopener noreferrer">צפייה בסרטון הביצוע</a>}<h2>על התרגיל</h2><p>{e.desc}</p>{e.primary&&<dl className="care-definition"><dt>שרירים עיקריים</dt><dd>{e.primary}</dd><dt>שרירים מסייעים</dt><dd>{e.secondary}</dd></dl>}<h3>דגשים לביצוע</h3><ul className="cue-list">{e.cues.map(c=><li key={c}><Check size={17}/>{c}</li>)}</ul><div className="detail-adjust"><div><span>אפשר להתחיל עם</span><strong>{e.easier}</strong></div><div><span>ולהתקדם אל</span><strong>{e.harder}</strong></div></div></div><div className="detail-side"><div className="panel"><span className="eyebrow">{e.dose==='בהתאמה אישית'?'מינון התרגיל':'מינון התחלתי לדוגמה'}</span><h2>{e.dose}</h2><p>רמת קושי: {e.level}</p><button className="button primary wide" disabled={busy||!controller.access?.canBuild||plan.some(x=>x.exerciseId===e.id)} onClick={()=>add(e.id)}>{plan.some(x=>x.exerciseId===e.id)?'נמצא בתוכנית':controller.access?.canBuild?'+ הוספה לתוכנית':'בחירת תרגילים במסלול העצמאי'}</button><FavoriteButton exercise={e} controller={controller} inline/></div><FeedbackButton key={e.id} context={'תרגיל: '+e.name} section="exercises" bodyRegion={feedbackRegion(e.group+' '+e.area)}/><div className="note">המינון וההתאמות הם מידע כללי. תרגול סביב פציעה דורש התאמה אישית לפי בדיקה ותגובה לאימון.</div></div></div></>})():section==='more'?<MoreArea go={s=>go(s as Section)} staffLinks={staffNav} signedIn={auth==='ready'}/>:section==='membership'?<MembershipWorkspace onChange={()=>{void controller.refresh();}}/>:section==='messages'?<MessagesWorkspace/>:section==='privacy'?<PrivacyWorkspace data={onboarding.data} refresh={onboarding.reload} editProfile={()=>go('onboarding')}/>:section==='dashboard'?<TeamDashboard go={s=>go(s as Section)}/>:section==='contact'?<ContactArea go={s=>go(s as Section)}/>:section==='settings'?<SettingsArea go={s=>go(s as Section)} onTour={()=>setTour(true)} canAdmin={staff.access==='staff'}/>:section==='home'?<>{staff.access==='member'&&!staff.careRole&&!onboarding.data?.staffRole&&!onboarding.data?.canAdmin&&<TraineeStart controller={controller} data={onboarding.data} loading={onboarding.loading} status={onboarding.status} retry={()=>{void onboarding.reload();void controller.refresh();}} go={s=>go(s as Section)}/>}<HomeIntroduction go={s=>go(s as Section)} completed={!!onboarding.data?.intake?.completed} returning={simpleTrainee} weeklyWorkouts={auth==='ready'?controller.feed.stats.week:null} activeWorkout={!!controller.feed.active} trainingBlocked={!!onboarding.data?.trainingBlocked}/>{!simpleTrainee&&<section className="home-stories"><StoriesWorkspace preview/></section>}{staffNav.length>0&&<TrainingDashboard controller={controller} go={go}/>}</>:section==='library'?null:section==='injuries'?<InjuryWorkspace controller={controller} onDetails={setSelected} selection={injury} onSelect={setInjury}/>:section==='nutrition'?<WellnessWorkspace/>:section==='readiness'?<WellnessWorkspace key="readiness" mode="recovery" initialTab="readiness"/>:section==='recovery'?<><button className="back-link" onClick={()=>go(recovery.from)}><ArrowRight size={18}/> {recovery.from==='plan'?'חזרה לתוכנית שלי':recovery.from==='care'?'חזרה לתיק שלי':'חזרה להתקדמות'}</button><WellnessWorkspace key={JSON.stringify(recovery)} mode="recovery" initialTab={recovery.tab} initialEpisodeId={recovery.episodeId}/></>:section==='feedback'?<FeedbackWorkspace/>:section==='learn'?<LearningArea onExercise={id=>{go('library');setSelected(id);}}/>:section==='stories'?<StoriesWorkspace feed={controller.feed}/>:section==='plan'&&onboarding.data?.trainingBlocked?<div className="panel care-empty"><HeartPulse size={28}/><h2>התוכנית ממתינה למענה הרופא</h2><p>אפשר להמשיך בלמידה וביצירת קשר עם הצוות.</p></div>:section==='workout'&&onboarding.data?.trainingBlocked&&!controller.feed.active?<div className="panel care-empty"><h2>פתיחת אימון מושהית עד לבירור רפואי</h2><button className="button primary" onClick={()=>go('messages')}>להודעות לצוות</button></div>:section==='plan'?<PlanWorkspace controller={controller} go={go}/>:section==='workout'?<WorkoutWorkspace controller={controller} go={go} onDraftChange={onWorkoutDraftChange} blocked={!!onboarding.data?.trainingBlocked}/>:section==='history'?<HistoryWorkspace controller={controller} go={go}/>:section==='consult'?<><ConsultationWorkspace canManage={staff.access==='staff'} openAdmin={()=>go('admin')}/><NutritionPricing/></>:section==='care'?<CareWorkspace onEditProfile={()=>go('onboarding')} onPlanChanged={()=>controller.refresh()}/>:section==='team'?<TeamWorkspace/>:section==='videos'?<><div className="workspace-heading"><div><span className="eyebrow">לומדים את התנועה</span><h1>סרטוני הדרכה</h1><p>הדגמות והסברים מהצוות של DoctorCoach.</p></div></div><VideoWorkspace kind="demo"/></>:section==='appointments'?<><div className="workspace-heading"><div><span className="eyebrow">נפגשים ומתקדמים</span><h1>התורים שלי</h1></div></div><AppointmentsWorkspace/></>:section==='admin'?<ServiceAdminWorkspace access={staff.access} retryAccess={staff.reload} viewCatalog={()=>go('consult')}/>:<><div className="page-heading"><span className="eyebrow">הצוות והגישה</span><h1>לנוע קדימה, ביחד</h1><p>DoctorCoach מחברת בין עולם אימוני הכוח לבין חשיבה רפואית על תנועה ועומס.</p></div><TeamProfiles/><HowItWorks go={s=>go(s as Section)}/><div className="team-grid"><div className="team-card"><div className="team-initial">ש</div><span>תורים ושירות</span><h2>שירה</h2><p>תיאום המפגשים עם תמיר ונדב ומעקב אחר התורים.</p><button className="text-button" onClick={()=>go('messages')}>לערוץ התיאום</button></div></div><div className="info-band"><UserRound size={28}/><div><h3>כלים לאנשי מקצוע</h3><p>הצוות יכול לשייך תוכניות, לעקוב אחר דיווחים ולתת משוב על סרטונים. כל תיק משותף בהזמנה ובאישור המתאמן, עם הרשאות נפרדות למידע רפואי.</p></div></div></>}
  <footer className="footer"><Brand compact/><span>DoctorCoach · נדב רון וד״ר תמיר עילם</span><span>מידע כללי בלבד; אינו תחליף לאבחון רפואי אישי.</span></footer></main></div>{menu&&<button className="mobile-overlay" aria-label="סגירת תפריט" onClick={()=>setMenu(false)}/>}<AreaMobileNav section={section} go={s=>go(s as Section)} openMenu={()=>setMenu(true)}/><WhatsAppBooking/><LaunchSplash/>{tour&&<NavigationTour simpleTrainee={simpleTrainee} activeWorkout={!!controller.feed.active} go={s=>go(s as Section)} done={completed=>{setTour(false);if(completed&&onboarding.data)void careRequest<OnboardingData>('/api/onboarding',{action:'tour'}).then(onboarding.setData).catch(()=>controller.notify('הסיור הסתיים, אך לא הצלחנו לשמור את סימון ההשלמה. אפשר להפעיל אותו שוב בכל עת.'));}}/>}<div className={`toast ${toast?'show':''}`} role="status">{toast}</div></div>}</Localize>
}

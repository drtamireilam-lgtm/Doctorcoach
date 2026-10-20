'use client';
import {Localize} from "../components/language-provider";
import type {PlanItem,TrainingFeed} from '../lib/training';
import {formatDate} from '../lib/training';
import {progressionProposal} from '../lib/program-progression';
import {WorkoutContext} from './workout-context';

export function ProgramProgression({item,programId,feed,apply}:{item:PlanItem;programId:string;feed:TrainingFeed;apply:(weight:number)=>void}){
 const proposal=progressionProposal(item,programId,feed);
 const source=feed.history.find(s=>s.id===proposal.sourceId);
 return <Localize>{<div className="load-suggestion"><strong>עומס לאימון הבא</strong><p>{proposal.reason}</p>{proposal.finishedAt&&<small>לפי האימון מ־{formatDate(proposal.finishedAt)}</small>}{proposal.weight!==null&&<><p>בטיוטה: {item.weight} ק״ג · הצעה: {proposal.weight} ק״ג</p><button type="button" className="button secondary" disabled={proposal.weight===item.weight} onClick={()=>apply(proposal.weight!)}>{proposal.weight===item.weight?'המשקל כבר מופיע בטיוטה':'העברת ההצעה לטיוטה'}</button><p className="care-muted">בדקו את הדיווחים ואת הציוד הזמין. המתאמן יקבל את העומס רק לאחר בדיקת התוכנית ופרסומה.</p></>}{source&&<details><summary>מוכנות וכאב באימון שעליו מבוססת ההצעה</summary><WorkoutContext session={source}/></details>}</div>}</Localize>;
}

'use client';
import {Localize} from './language-provider';
import {useCareResource} from '../hooks/use-care';
import {CareGate} from './care-ui';
import type {feedbackReport} from '../lib/feedback-report';
type Data=Awaited<ReturnType<ReturnType<typeof feedbackReport>['summary']>>;
export function FeedbackSummary(){const r=useCareResource<Data>('/api/feedback/report');return <Localize><section className="panel care-form"><h2>סיכום משוב — שבעת הימים האחרונים</h2>{!r.data?<CareGate {...r} section="feedback"/>:<><div className="care-tags"><span>{Number(r.data.counts?.submittedWeek??0)} פניות חדשות</span><span>{Number(r.data.counts?.contributorsWeek??0)} משתתפים נתנו משוב</span><span>{Number(r.data.counts?.pending??0)} פניות פתוחות בסך הכול</span><span>{Number(r.data.counts?.resolvedWeek??0)} פניות טופלו השבוע</span><span>{Number(r.data.pilot?.joinedWeek??0)} מצטרפים לפיילוט השבוע</span></div>{r.data.topics.map(t=><div key={t.section+t.bodyRegion+t.category}><strong>{t.sectionLabel} · {t.regionLabel} · {t.category}</strong><p>{t.count} פניות · {t.contributors} משתתפים · {t.pending} טרם טופלו</p></div>)}{!r.data.topics.length&&<p>טרם התקבל משוב בשבוע האחרון.</p>}<button className="button secondary" onClick={r.reload}>רענון הסיכום</button></>}</section></Localize>;}

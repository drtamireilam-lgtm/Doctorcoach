import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile, bodyRegions } from './domain';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type Appointment = { id: string; service: 'medical' | 'training' | 'nutrition'; date: string; status: 'requested' | 'confirmed' | 'completed' | 'cancelled' };
type Subscription = { id: string; track: 'SELF' | 'COACHING' | 'MEDICAL' | 'NUTRITION'; duration: 'one-time' | '1-month' | '3-month' | '6-month' | '12-month'; status: 'draft' | 'active' | 'cancelled' };
type Feedback = { id: string; context: string; type: 'unclear' | 'deeper' | 'topic' | 'improvement'; text: string; createdAt: string };
type State = { appointments: Appointment[]; subscriptions: Subscription[]; feedback: Feedback[]; selectedRegion: string; selectedTopic: string };
const initial: State = { appointments: [], subscriptions: [], feedback: [], selectedRegion: 'Shoulder', selectedTopic: 'Anatomy' };
const repo = new VersionedRepository<State>(new BrowserStorageStore(), 'services-education-state', 1);

const educationMap: Record<string, string[]> = {
  Shoulder: ['Rotator cuff', 'Deltoid', 'Scapular mechanics', 'Pressing tolerance'],
  'Lumbar spine': ['Lumbar extensors', 'Core bracing', 'Hip hinge', 'Load tolerance'],
  Knee: ['Quadriceps', 'Hamstrings', 'Patellar tendon', 'Squat tolerance'],
  'Hip / Groin': ['Gluteals', 'Adductors', 'Hip flexors', 'Single-leg control'],
};

export default function ServicesEducationWorkspace({ mode, profile }: { mode: 'education' | 'appointments'; profile: AthleteProfile }) {
  const [state, setState] = useState(initial); const [loaded, setLoaded] = useState(false);
  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);
  return mode === 'education' ? <Education state={state} setState={setState} profile={profile} /> : <Appointments state={state} setState={setState} />;
}

function Education({ state, setState, profile }: { state: State; setState: React.Dispatch<React.SetStateAction<State>>; profile: AthleteProfile }) {
  const [feedbackText, setFeedbackText] = useState(''); const [feedbackType, setFeedbackType] = useState<Feedback['type']>('unclear');
  const topics = educationMap[state.selectedRegion] || ['Regional anatomy', 'Common movement patterns', 'Rehab relevance', 'Related exercises'];
  const addFeedback = () => { if (!feedbackText.trim()) return; setState((s) => ({ ...s, feedback: [{ id: `fb-${Date.now()}`, context: `${s.selectedRegion} / ${s.selectedTopic}`, type: feedbackType, text: feedbackText.trim(), createdAt: new Date().toISOString() }, ...s.feedback] })); setFeedbackText(''); };
  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">ANATOMY & EDUCATION</p><h2>Body → Region → Muscle → Injury relevance → Exercise.</h2><p>Current shared injury region: {profile.intake.injuryRegion || 'not selected'}.</p></section>
    <section className="card"><h3>Body regions</h3><div className="region-list">{bodyRegions.map((r) => <button key={r} className={state.selectedRegion === r ? 'region-button selected' : 'region-button'} onClick={() => setState((s) => ({ ...s, selectedRegion: r, selectedTopic: 'Anatomy' }))}>{r}</button>)}</div></section>
    <section className="card"><h3>{state.selectedRegion}</h3><div className="education-topic-list">{topics.map((t) => <button key={t} className={state.selectedTopic === t ? 'choice selected' : 'choice'} onClick={() => setState((s) => ({ ...s, selectedTopic: t }))}>{t}</button>)}</div></section>
    <section className="module-card"><p className="eyebrow">CONTENT PAGE</p><h2>{state.selectedTopic}</h2><div className="selected-panel"><strong>{state.selectedRegion}</strong><span>Structured page placeholder for anatomy, function, common injury patterns, rehab relevance and related exercises. This is linked to the shared body-region architecture.</span></div><div className="feature-grid"><div className="mini-card"><strong>Anatomy</strong><span>Origin/insertion/function and movement role.</span></div><div className="mini-card"><strong>Injury relation</strong><span>Educational context without automated diagnosis.</span></div><div className="mini-card"><strong>Related exercises</strong><span>Training and rehab exercise links.</span></div></div></section>
    <section className="module-card"><p className="eyebrow">CONTEXTUAL FEEDBACK</p><h2>Help the team improve this page</h2><div className="form-grid"><select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value as Feedback['type'])}><option value="unclear">Something is unclear</option><option value="deeper">Explain deeper</option><option value="topic">Request topic</option><option value="improvement">Improvement idea</option></select><textarea placeholder="Feedback" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} /></div><button className="primary-button" onClick={addFeedback}>Send feedback</button><p className="muted">{state.feedback.length} feedback items saved in the MVP.</p></section>
  </div>;
}

function Appointments({ state, setState }: { state: State; setState: React.Dispatch<React.SetStateAction<State>> }) {
  const [service, setService] = useState<Appointment['service']>('medical'); const [date, setDate] = useState('');
  const [track, setTrack] = useState<Subscription['track']>('MEDICAL'); const [duration, setDuration] = useState<Subscription['duration']>('one-time');
  const request = () => { if (!date) return; setState((s) => ({ ...s, appointments: [{ id: `appt-${Date.now()}`, service, date, status: 'requested' }, ...s.appointments] })); };
  const createCheckoutDraft = () => setState((s) => ({ ...s, subscriptions: [{ id: `sub-${Date.now()}`, track, duration, status: 'draft' }, ...s.subscriptions] }));
  const active = useMemo(() => state.subscriptions.filter((x) => x.status === 'active').length, [state.subscriptions]);
  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">APPOINTMENTS & SERVICES</p><h2>Consultations, subscriptions and follow-up in one flow.</h2><p>Payment actions below are checkout drafts only until a production payment provider is connected.</p></section>
    <section className="card"><h3>Request appointment</h3><select value={service} onChange={(e) => setService(e.target.value as Appointment['service'])}><option value="medical">Medical consultation</option><option value="training">Training consultation</option><option value="nutrition">Nutrition consultation</option></select><input className="library-search" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /><button className="primary-button" onClick={request}>Request appointment</button></section>
    <section className="card"><h3>Service / subscription</h3><select value={track} onChange={(e) => setTrack(e.target.value as Subscription['track'])}><option>SELF</option><option>COACHING</option><option>MEDICAL</option><option>NUTRITION</option></select><select value={duration} onChange={(e) => setDuration(e.target.value as Subscription['duration'])}><option value="one-time">One-time</option><option value="1-month">1 month</option><option value="3-month">3 months</option><option value="6-month">6 months</option><option value="12-month">12 months</option></select><button className="outline-button" onClick={createCheckoutDraft}>Create checkout draft</button><p>Active subscriptions: {active}</p></section>
    <section className="module-card"><p className="eyebrow">APPOINTMENT HISTORY</p><h2>Requests</h2><div className="timeline-list">{state.appointments.length === 0 ? <div className="empty-state">No appointment requests yet.</div> : state.appointments.map((a) => <div className="timeline-event" key={a.id}><div><strong>{a.service}</strong><span>{a.date}</span></div><small>{a.status}</small></div>)}</div></section>
    <section className="module-card"><p className="eyebrow">PAYMENT READINESS</p><h2>Commercial flow scaffold</h2><div className="feature-grid"><div className="mini-card"><strong>Medical</strong><span>One-time consultation checkout.</span></div><div className="mini-card"><strong>Coaching / SELF</strong><span>Recurring subscription-ready model.</span></div><div className="mini-card"><strong>Nutrition</strong><span>1 / 3 / 6 / 12-month duration support.</span></div></div><div className="alert">No real payment is processed in the current MVP. Production requires a payment provider, webhook verification, server-side entitlement checks and legal/tax configuration.</div></section>
  </div>;
}

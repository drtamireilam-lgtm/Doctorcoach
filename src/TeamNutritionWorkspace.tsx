import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type TeamNote = { id: string; author: string; discipline: 'medical' | 'training' | 'nutrition' | 'admin'; text: string; mentions: string[]; createdAt: string };
type FollowUp = { id: string; queue: 'medical' | 'coach' | 'dietitian'; title: string; due: string; done: boolean };
type NutritionState = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mode: 'macros' | 'flexible';
  trainingDayNotes: string;
  restDayNotes: string;
  adherence: Array<{ date: string; score: number }>;
  weeklyCheckins: Array<{ date: string; weight?: number; hunger: number; energy: number; notes: string }>;
  notes: string;
};
type WorkspaceState = { notes: TeamNote[]; followUps: FollowUp[]; nutrition: NutritionState };

const initialState: WorkspaceState = {
  notes: [],
  followUps: [
    { id: 'fu-med', queue: 'medical', title: 'Review current restrictions', due: 'Today', done: false },
    { id: 'fu-coach', queue: 'coach', title: 'Review next training progression', due: 'This week', done: false },
    { id: 'fu-diet', queue: 'dietitian', title: 'Weekly nutrition check-in', due: 'Friday', done: false },
  ],
  nutrition: { calories: 2200, protein: 170, carbs: 220, fat: 70, mode: 'macros', trainingDayNotes: '', restDayNotes: '', adherence: [], weeklyCheckins: [], notes: '' },
};

const repo = new VersionedRepository<WorkspaceState>(new BrowserStorageStore(), 'team-nutrition-state', 1);

export default function TeamNutritionWorkspace({ mode, profile, user }: { mode: 'team' | 'nutrition'; profile: AthleteProfile; user: AuthUser }) {
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);
  return mode === 'team' ? <TeamDashboard state={state} setState={setState} profile={profile} user={user} /> : <NutritionWorkspace state={state} setState={setState} user={user} />;
}

function TeamDashboard({ state, setState, profile, user }: { state: WorkspaceState; setState: React.Dispatch<React.SetStateAction<WorkspaceState>>; profile: AthleteProfile; user: AuthUser }) {
  const [text, setText] = useState('');
  const [mention, setMention] = useState('@team');
  const canNote = can(user, 'team:notes') || can(user, 'admin:manage');
  const discipline = (user.roles.includes('medical') ? 'medical' : user.roles.includes('coach') ? 'training' : user.roles.includes('dietitian') ? 'nutrition' : 'admin') as TeamNote['discipline'];
  const addNote = () => {
    if (!canNote || !text.trim()) return;
    const note: TeamNote = { id: `note-${Date.now()}`, author: user.displayName, discipline, text: text.trim(), mentions: [mention], createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, notes: [note, ...s.notes] })); setText('');
  };
  const toggleFollowUp = (id: string) => setState((s) => ({ ...s, followUps: s.followUps.map((f) => f.id === id ? { ...f, done: !f.done } : f) }));
  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">TEAM DASHBOARD</p><h2>One shared operational view across Medical, Training and Nutrition.</h2><p>{profile.intake.restrictions ? `Shared restriction: ${profile.intake.restrictions}` : 'No shared restriction recorded.'}</p></section>
    <section className="card"><h3>Medical queue</h3><Queue items={state.followUps.filter((f) => f.queue === 'medical')} onToggle={toggleFollowUp} /></section>
    <section className="card"><h3>Coach queue</h3><Queue items={state.followUps.filter((f) => f.queue === 'coach')} onToggle={toggleFollowUp} /></section>
    <section className="card"><h3>Dietitian queue</h3><Queue items={state.followUps.filter((f) => f.queue === 'dietitian')} onToggle={toggleFollowUp} /></section>
    <section className="card"><h3>Shared snapshot</h3><p>Injury: {profile.intake.injuryRegion || '—'}</p><p>Pain: {profile.intake.painNow}/10</p><p>Training: {profile.assignedPlanId ? 'Assigned plan active' : 'No plan'}</p></section>
    <section className="module-card"><p className="eyebrow">INTERNAL NOTES & MENTIONS</p><h2>Professional collaboration</h2><div className="form-grid"><textarea disabled={!canNote} placeholder="Add an internal note" value={text} onChange={(e) => setText(e.target.value)} /><select disabled={!canNote} value={mention} onChange={(e) => setMention(e.target.value)}><option>@team</option><option>@medical</option><option>@coach</option><option>@nutrition</option></select></div><button className="primary-button" disabled={!canNote} onClick={addNote}>Add team note</button><div className="timeline-list team-note-list">{state.notes.length === 0 ? <div className="empty-state">No internal notes yet.</div> : state.notes.map((n) => <div className="timeline-event" key={n.id}><div><strong>{n.author} · {n.discipline}</strong><span>{n.text}</span><small>{n.mentions.join(' ')}</small></div><small>{new Date(n.createdAt).toLocaleString()}</small></div>)}</div></section>
  </div>;
}

function Queue({ items, onToggle }: { items: FollowUp[]; onToggle: (id: string) => void }) {
  return <div className="queue-list">{items.map((item) => <label className="queue-item" key={item.id}><input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} /><span><strong>{item.title}</strong><small>{item.due}</small></span></label>)}</div>;
}

function NutritionWorkspace({ state, setState, user }: { state: WorkspaceState; setState: React.Dispatch<React.SetStateAction<WorkspaceState>>; user: AuthUser }) {
  const canWrite = can(user, 'nutrition:write') || can(user, 'admin:manage');
  const n = state.nutrition;
  const [daily, setDaily] = useState(8);
  const [weight, setWeight] = useState('');
  const [hunger, setHunger] = useState(5);
  const [energy, setEnergy] = useState(7);
  const [checkNotes, setCheckNotes] = useState('');
  const patch = (p: Partial<NutritionState>) => setState((s) => ({ ...s, nutrition: { ...s.nutrition, ...p } }));
  const addAdherence = () => patch({ adherence: [...n.adherence, { date: new Date().toISOString(), score: daily }] });
  const addCheckin = () => patch({ weeklyCheckins: [...n.weeklyCheckins, { date: new Date().toISOString(), weight: weight ? Number(weight) : undefined, hunger, energy, notes: checkNotes }] });
  const avg = useMemo(() => n.adherence.length ? Math.round(n.adherence.reduce((a, b) => a + b.score, 0) / n.adherence.length * 10) : 0, [n.adherence]);
  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">NUTRITION</p><h2>Dietitian-led plan connected to training and body-weight progress.</h2><p>Plan mode: {n.mode === 'macros' ? 'Calories & macros' : 'Flexible principles'}</p></section>
    <section className="card"><h3>Nutrition plan</h3><div className="choice-row"><button disabled={!canWrite} className={n.mode === 'macros' ? 'choice selected' : 'choice'} onClick={() => patch({ mode: 'macros' })}>Macros</button><button disabled={!canWrite} className={n.mode === 'flexible' ? 'choice selected' : 'choice'} onClick={() => patch({ mode: 'flexible' })}>Flexible</button></div><div className="nutrition-macros"><Metric label="Calories" value={n.calories} set={(v) => patch({ calories: v })} disabled={!canWrite} /><Metric label="Protein" value={n.protein} set={(v) => patch({ protein: v })} disabled={!canWrite} /><Metric label="Carbs" value={n.carbs} set={(v) => patch({ carbs: v })} disabled={!canWrite} /><Metric label="Fat" value={n.fat} set={(v) => patch({ fat: v })} disabled={!canWrite} /></div></section>
    <section className="card"><h3>Training / rest day guidance</h3><textarea disabled={!canWrite} placeholder="Training-day plan" value={n.trainingDayNotes} onChange={(e) => patch({ trainingDayNotes: e.target.value })} /><textarea disabled={!canWrite} placeholder="Rest-day plan" value={n.restDayNotes} onChange={(e) => patch({ restDayNotes: e.target.value })} /></section>
    <section className="card"><h3>Daily adherence</h3><label className="range-row"><span>Adherence</span><input type="range" min="0" max="10" value={daily} onChange={(e) => setDaily(Number(e.target.value))} /><b>{daily}/10</b></label><button className="outline-button" onClick={addAdherence}>Save today</button><p>Average: <strong>{avg ? `${avg}%` : '—'}</strong></p></section>
    <section className="card"><h3>Weekly check-in</h3><div className="form-grid"><input placeholder="Body weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} /><input type="number" min="0" max="10" value={hunger} onChange={(e) => setHunger(Number(e.target.value))} /><input type="number" min="0" max="10" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} /><textarea placeholder="Check-in notes" value={checkNotes} onChange={(e) => setCheckNotes(e.target.value)} /></div><button className="primary-button" onClick={addCheckin}>Save weekly check-in</button></section>
    <section className="module-card"><p className="eyebrow">DIETITIAN NOTES</p><h2>Private nutrition notes</h2><textarea className="wide-textarea" disabled={!canWrite} value={n.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Dietitian-only notes" /><div className="summary-grid"><div className="mini-card"><span>Daily entries</span><strong>{n.adherence.length}</strong></div><div className="mini-card"><span>Weekly check-ins</span><strong>{n.weeklyCheckins.length}</strong></div><div className="mini-card"><span>Latest weight</span><strong>{n.weeklyCheckins.at(-1)?.weight ?? '—'}</strong></div><div className="mini-card"><span>Plan</span><strong>{n.mode}</strong></div></div></section>
  </div>;
}

function Metric({ label, value, set, disabled }: { label: string; value: number; set: (v: number) => void; disabled: boolean }) { return <label className="stacked-label">{label}<input disabled={disabled} type="number" value={value} onChange={(e) => set(Number(e.target.value))} /></label>; }

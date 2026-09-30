import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile } from './domain';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type RehabPhase = { id: string; name: string; target: string; complete: boolean };
type RehabEntry = { id: string; recordedAt: string; exercise: string; painBefore: number; painDuring: number; painAfter: number; painNextDay: number; rom: number; completed: boolean };
type BodyWeightEntry = { id: string; recordedAt: string; kg: number };

type RehabState = {
  activePhase: number;
  phases: RehabPhase[];
  entries: RehabEntry[];
  bodyWeight: BodyWeightEntry[];
};

const defaultPhases: RehabPhase[] = [
  { id: 'protect', name: '1 · Protection / symptom control', target: 'Control irritability and establish safe tolerated movement.', complete: true },
  { id: 'rom', name: '2 · Restore ROM / tolerance', target: 'Improve movement tolerance and restore relevant range.', complete: false },
  { id: 'capacity', name: '3 · Capacity rebuilding', target: 'Build local tissue and movement capacity.', complete: false },
  { id: 'strength', name: '4 · Strength / load exposure', target: 'Progress load while monitoring pain response.', complete: false },
  { id: 'specific', name: '5 · Gym / sport-specific return', target: 'Reintroduce task-specific loading and volume.', complete: false },
  { id: 'return', name: '6 · Return to unrestricted training', target: 'Meet return criteria and resume unrestricted training.', complete: false },
];

const initialState: RehabState = { activePhase: 1, phases: defaultPhases, entries: [], bodyWeight: [] };
const repo = new VersionedRepository<RehabState>(new BrowserStorageStore(), 'rehab-state', 1);

function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export default function RehabWorkspace({ profile }: { profile: AthleteProfile }) {
  const [state, setState] = useState<RehabState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [exercise, setExercise] = useState(profile.intake.injuryRegion ? `${profile.intake.injuryRegion} rehab drill` : 'Rehab exercise');
  const [painBefore, setPainBefore] = useState(profile.intake.painNow || 0);
  const [painDuring, setPainDuring] = useState(0);
  const [painAfter, setPainAfter] = useState(0);
  const [painNextDay, setPainNextDay] = useState(0);
  const [rom, setRom] = useState(0);
  const [weight, setWeight] = useState(0);

  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [state, loaded]);

  const currentPhase = state.phases[state.activePhase] ?? state.phases[0];
  const latestEntries = useMemo(() => [...state.entries].sort((a,b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 8), [state.entries]);
  const latestWeight = state.bodyWeight[state.bodyWeight.length - 1];
  const adherence = state.entries.length ? Math.round((state.entries.filter(e => e.completed).length / state.entries.length) * 100) : 0;
  const latestRom = state.entries[state.entries.length - 1]?.rom ?? null;
  const latestNextDayPain = state.entries[state.entries.length - 1]?.painNextDay ?? null;

  const saveEntry = () => {
    const entry: RehabEntry = { id: id('rehab'), recordedAt: new Date().toISOString(), exercise, painBefore, painDuring, painAfter, painNextDay, rom, completed: true };
    setState((s) => ({ ...s, entries: [...s.entries, entry] }));
  };

  const saveWeight = () => {
    if (weight <= 0) return;
    setState((s) => ({ ...s, bodyWeight: [...s.bodyWeight, { id: id('weight'), recordedAt: new Date().toISOString(), kg: weight }] }));
  };

  const markPhase = (index: number) => {
    setState((s) => ({ ...s, activePhase: index, phases: s.phases.map((p, i) => i < index ? { ...p, complete: true } : i === index ? p : { ...p, complete: false }) }));
  };

  return <div className="content-grid">
    <section className="hero-card">
      <p className="eyebrow">INJURY JOURNEY</p>
      <h2>{profile.intake.injuryRegion || 'Rehabilitation'} · Phase {state.activePhase + 1}</h2>
      <p>{currentPhase.target}</p>
      <div className="phase-track">{state.phases.map((phase, index) => <button key={phase.id} className={index === state.activePhase ? 'phase-pill active' : phase.complete ? 'phase-pill done' : 'phase-pill'} onClick={() => markPhase(index)}>{index + 1}</button>)}</div>
    </section>

    <section className="card"><h3>Current rehab metrics</h3><div className="metric-cards"><Metric label="Adherence" value={`${adherence}%`} /><Metric label="Latest ROM" value={latestRom == null ? '—' : `${latestRom}°`} /><Metric label="Next-day pain" value={latestNextDayPain == null ? '—' : `${latestNextDayPain}/10`} /><Metric label="Body weight" value={latestWeight ? `${latestWeight.kg} kg` : '—'} /></div></section>

    <section className="card"><h3>Log rehab exercise</h3><label className="stacked-label">Exercise<input value={exercise} onChange={(e) => setExercise(e.target.value)} /></label><div className="rehab-ranges"><Range label="Pain before" value={painBefore} setValue={setPainBefore} /><Range label="Pain during" value={painDuring} setValue={setPainDuring} /><Range label="Immediately after" value={painAfter} setValue={setPainAfter} /><Range label="Next day" value={painNextDay} setValue={setPainNextDay} /></div><label className="stacked-label">ROM / measured degrees<input type="number" min="0" value={rom} onChange={(e) => setRom(Number(e.target.value))} /></label><button className="primary-button" onClick={saveEntry}>Save rehab entry</button></section>

    <section className="card"><h3>Body weight</h3><label className="stacked-label">Weight (kg)<input type="number" step="0.1" value={weight || ''} onChange={(e) => setWeight(Number(e.target.value))} /></label><button className="outline-button" onClick={saveWeight}>Save weight</button><MiniBars values={state.bodyWeight.slice(-8).map((x) => x.kg)} suffix="kg" /></section>

    <section className="module-card"><p className="eyebrow">REHAB HISTORY</p><h2>Pain + ROM over time</h2>{latestEntries.length === 0 ? <div className="empty-state">No rehab entries yet.</div> : <div className="rehab-history">{latestEntries.map((entry) => <div className="rehab-history-row" key={entry.id}><div><strong>{entry.exercise}</strong><span>{new Date(entry.recordedAt).toLocaleString()}</span></div><div className="rehab-badges"><span>Before {entry.painBefore}/10</span><span>During {entry.painDuring}/10</span><span>After {entry.painAfter}/10</span><span>Next day {entry.painNextDay}/10</span><span>ROM {entry.rom}°</span></div></div>)}</div>}</section>
  </div>;
}

function Range({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <label className="range-row"><span>{label}</span><input type="range" min="0" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} /><b>{value}/10</b></label>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="mini-card"><span>{label}</span><strong>{value}</strong></div>; }

function MiniBars({ values, suffix }: { values: number[]; suffix: string }) {
  if (!values.length) return <div className="empty-state">No entries yet.</div>;
  const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  return <div className="mini-bars">{values.map((value, i) => <div key={i} title={`${value} ${suffix}`}><span style={{ height: `${20 + ((value - min) / span) * 70}%` }} /></div>)}</div>;
}

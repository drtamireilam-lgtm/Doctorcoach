import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile, EffortMode, estimateE1RM, suggestedNextLoad } from './domain';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

type LibraryExercise = { id: string; name: string; region: string; pattern: string };
type PlannedExercise = LibraryExercise & { day: string; sets: number; reps: number; load: number; targetEffort: number; substitutions: string[] };
type LoggedSet = { exerciseId: string; setNumber: number; load: number; reps: number; effort: number; completed: boolean; pain?: number };
type TrainingState = { plan: PlannedExercise[]; logs: LoggedSet[]; readiness: { sleep: number; fatigue: number; pain: number; completed: boolean }; substitutionRequests: string[] };

const library: LibraryExercise[] = [
  { id: 'leg-press', name: 'Leg Press', region: 'Lower body', pattern: 'Knee dominant' },
  { id: 'rdl', name: 'Romanian Deadlift', region: 'Lower body', pattern: 'Hip hinge' },
  { id: 'split-squat', name: 'Split Squat', region: 'Lower body', pattern: 'Single-leg' },
  { id: 'leg-curl', name: 'Seated Leg Curl', region: 'Lower body', pattern: 'Knee flexion' },
  { id: 'calf-raise', name: 'Standing Calf Raise', region: 'Lower body', pattern: 'Plantar flexion' },
  { id: 'bench', name: 'Bench Press', region: 'Chest', pattern: 'Horizontal push' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', region: 'Chest', pattern: 'Incline push' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', region: 'Back', pattern: 'Vertical pull' },
  { id: 'row', name: 'Chest Supported Row', region: 'Back', pattern: 'Horizontal pull' },
  { id: 'shoulder-press', name: 'Machine Shoulder Press', region: 'Shoulders', pattern: 'Vertical push' },
  { id: 'lateral-raise', name: 'Cable Lateral Raise', region: 'Shoulders', pattern: 'Abduction' },
  { id: 'curl', name: 'Cable Curl', region: 'Arms', pattern: 'Elbow flexion' },
  { id: 'pushdown', name: 'Triceps Pushdown', region: 'Arms', pattern: 'Elbow extension' },
  { id: 'pallof', name: 'Pallof Press', region: 'Core', pattern: 'Anti-rotation' },
];

const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4'];
const defaultPlan: PlannedExercise[] = [
  { ...library[0], day: 'Day 1', sets: 3, reps: 8, load: 80, targetEffort: 8, substitutions: ['split-squat'] },
  { ...library[1], day: 'Day 1', sets: 3, reps: 8, load: 60, targetEffort: 8, substitutions: ['leg-curl'] },
];
const initialState: TrainingState = { plan: defaultPlan, logs: [], readiness: { sleep: 7, fatigue: 4, pain: 2, completed: false }, substitutionRequests: [] };
const repo = new VersionedRepository<TrainingState>(new BrowserStorageStore(), 'training-state', 1);

export default function TrainingWorkspace({ profile, setProfile }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>> }) {
  const [view, setView] = useState<'coach' | 'trainee'>('coach');
  const [day, setDay] = useState('Day 1');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [state, setState] = useState<TrainingState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { repo.load().then((saved) => { if (saved) setState(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, state]);

  const regions = ['All', ...Array.from(new Set(library.map((e) => e.region)))];
  const filtered = useMemo(() => library.filter((e) => (region === 'All' || e.region === region) && e.name.toLowerCase().includes(query.toLowerCase())), [region, query]);
  const dayPlan = state.plan.filter((e) => e.day === day);

  const addExercise = (exercise: LibraryExercise) => {
    if (state.plan.some((p) => p.id === exercise.id && p.day === day)) return;
    setState((s) => ({ ...s, plan: [...s.plan, { ...exercise, day, sets: 3, reps: 10, load: 0, targetEffort: profile.trainingMode === 'RPE' ? 8 : 2, substitutions: [] }] }));
  };
  const patchExercise = (id: string, patch: Partial<PlannedExercise>) => setState((s) => ({ ...s, plan: s.plan.map((e) => e.id === id && e.day === day ? { ...e, ...patch } : e) }));
  const removeExercise = (id: string) => setState((s) => ({ ...s, plan: s.plan.filter((e) => !(e.id === id && e.day === day)) }));
  const changeMode = (mode: EffortMode) => setProfile((p) => ({ ...p, trainingMode: mode }));

  return <div className="training-workspace">
    <section className="module-card training-header"><div><p className="eyebrow">TRAINING SYSTEM</p><h2>{view === 'coach' ? 'Coach Workout Builder' : 'Trainee Workout'}</h2><p>{view === 'coach' ? 'Build and assign the program without overwriting the athlete history.' : 'Complete readiness first, then log every set with pain and effort.'}</p></div><div className="builder-toolbar"><button className={view === 'coach' ? 'choice selected' : 'choice'} onClick={() => setView('coach')}>Coach view</button><button className={view === 'trainee' ? 'choice selected' : 'choice'} onClick={() => setView('trainee')}>Trainee view</button></div></section>

    <section className="card training-controls"><div className="day-tabs">{days.map((d) => <button key={d} className={day === d ? 'region-button selected' : 'region-button'} onClick={() => setDay(d)}>{d}</button>)}</div><div className="mode-switch compact-switch"><button className={profile.trainingMode === 'RPE' ? 'choice selected' : 'choice'} onClick={() => changeMode('RPE')}>RPE</button><button className={profile.trainingMode === 'RIR' ? 'choice selected' : 'choice'} onClick={() => changeMode('RIR')}>RIR</button></div></section>

    {view === 'coach' ? <div className="builder-grid">
      <section className="card library-panel"><div className="panel-title"><div><p className="eyebrow">EXERCISE LIBRARY</p><h3>Add exercises</h3></div><span>{filtered.length} exercises</span></div><input className="library-search" placeholder="Search exercise" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="filter-row">{regions.map((r) => <button key={r} className={region === r ? 'filter-chip active' : 'filter-chip'} onClick={() => setRegion(r)}>{r}</button>)}</div><div className="exercise-library-list">{filtered.map((exercise) => { const selected = state.plan.some((p) => p.id === exercise.id && p.day === day); return <div className="library-row" key={exercise.id}><div><strong>{exercise.name}</strong><span>{exercise.region} · {exercise.pattern}</span></div><button className={selected ? 'add-button added' : 'add-button'} onClick={() => addExercise(exercise)}>{selected ? '✓' : '+'}</button></div>; })}</div></section>
      <section className="card plan-panel"><div className="panel-title"><div><p className="eyebrow">{day.toUpperCase()}</p><h3>Selected exercises</h3></div><span>{dayPlan.length} selected</span></div>{dayPlan.length === 0 && <div className="empty-state">Use the + button to assign exercises to this day.</div>}<div className="plan-list">{dayPlan.map((exercise, index) => <div className="plan-exercise" key={exercise.id}><div className="plan-exercise-head"><div><span className="exercise-index">{index + 1}</span><strong>{exercise.name}</strong><small>{exercise.pattern}</small></div><button className="remove-button" onClick={() => removeExercise(exercise.id)}>Remove</button></div><div className="prescription-grid"><label>Sets<input type="number" min="1" value={exercise.sets} onChange={(e) => patchExercise(exercise.id, { sets: Number(e.target.value) })} /></label><label>Reps<input type="number" min="1" value={exercise.reps} onChange={(e) => patchExercise(exercise.id, { reps: Number(e.target.value) })} /></label><label>Starting load<input type="number" min="0" step="0.5" value={exercise.load} onChange={(e) => patchExercise(exercise.id, { load: Number(e.target.value) })} /></label><label>Target {profile.trainingMode}<input type="number" min="0" max="10" step="0.5" value={exercise.targetEffort} onChange={(e) => patchExercise(exercise.id, { targetEffort: Number(e.target.value) })} /></label></div><label className="stacked-label">Approved substitutions<select multiple value={exercise.substitutions} onChange={(e) => patchExercise(exercise.id, { substitutions: Array.from(e.target.selectedOptions).map((o) => o.value) })}>{library.filter((x) => x.id !== exercise.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>)}</div><div className="builder-save"><button className="primary-button">Save & assign {day}</button><small>Plan and set logs persist locally in the MVP.</small></div></section>
    </div> : <TraineeSession day={day} plan={dayPlan} mode={profile.trainingMode} state={state} setState={setState} />}
  </div>;
}

function TraineeSession({ day, plan, mode, state, setState }: { day: string; plan: PlannedExercise[]; mode: EffortMode; state: TrainingState; setState: React.Dispatch<React.SetStateAction<TrainingState>> }) {
  const updateLog = (exerciseId: string, setNumber: number, patch: Partial<LoggedSet>, defaults: LoggedSet) => setState((s) => { const exists = s.logs.some((l) => l.exerciseId === exerciseId && l.setNumber === setNumber); return { ...s, logs: exists ? s.logs.map((l) => l.exerciseId === exerciseId && l.setNumber === setNumber ? { ...l, ...patch } : l) : [...s.logs, { ...defaults, ...patch }] }; });
  const getLog = (exercise: PlannedExercise, setNumber: number): LoggedSet => state.logs.find((l) => l.exerciseId === exercise.id && l.setNumber === setNumber) || { exerciseId: exercise.id, setNumber, load: exercise.load, reps: exercise.reps, effort: exercise.targetEffort, completed: false, pain: 0 };
  const readinessScore = Math.round(((state.readiness.sleep + (10-state.readiness.fatigue) + (10-state.readiness.pain)) / 30) * 100);

  if (!state.readiness.completed) return <section className="module-card"><p className="eyebrow">PRE-SESSION READINESS</p><h2>Check in before {day}</h2><div className="metric-inputs"><Range label="Sleep" value={state.readiness.sleep} setValue={(v) => setState((s) => ({ ...s, readiness: { ...s.readiness, sleep: v } }))} /><Range label="Fatigue" value={state.readiness.fatigue} setValue={(v) => setState((s) => ({ ...s, readiness: { ...s.readiness, fatigue: v } }))} /><Range label="Current pain" value={state.readiness.pain} setValue={(v) => setState((s) => ({ ...s, readiness: { ...s.readiness, pain: v } }))} /></div><div className="safe-box">Readiness score: {readinessScore}%</div><button className="primary-button" onClick={() => setState((s) => ({ ...s, readiness: { ...s.readiness, completed: true } }))}>Start workout</button></section>;

  return <section className="module-card trainee-session"><p className="eyebrow">ASSIGNED PROGRAM</p><h2>{day}</h2><div className="permission-note">You can log performance and pain. Exercise substitutions remain limited to coach-approved alternatives.</div>{plan.length === 0 && <div className="empty-state">No exercises assigned to this day yet.</div>}<div className="session-exercises">{plan.map((exercise) => <div className="exercise-card session-card" key={exercise.id}><div className="session-title"><div><h3>{exercise.name}</h3><small>{exercise.sets} × {exercise.reps} · Target {mode} {exercise.targetEffort}</small></div>{exercise.substitutions.length ? <select onChange={(e) => e.target.value && setState((s) => ({ ...s, substitutionRequests: [...s.substitutionRequests, `${exercise.id}:${e.target.value}`] }))}><option value="">Approved substitution</option>{exercise.substitutions.map((id) => <option key={id} value={id}>{library.find((x) => x.id === id)?.name || id}</option>)}</select> : <button className="outline-button" disabled>No substitutions</button>}</div><div className="set-table"><div className="set-row set-head"><span>Set</span><span>Load</span><span>Reps</span><span>{mode}</span><span>Pain</span><span>e1RM</span><span>Next</span></div>{Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => { const log = getLog(exercise, setNumber); const e1rm = estimateE1RM({ load: log.load, reps: log.reps, effort: log.effort }, mode); const next = suggestedNextLoad({ load: log.load, reps: log.reps, effort: log.effort }, exercise.targetEffort, mode); return <div className="set-row set-row-seven" key={setNumber}><strong>{setNumber}</strong><input type="number" step="0.5" value={log.load} onChange={(e) => updateLog(exercise.id, setNumber, { load: Number(e.target.value) }, log)} /><input type="number" value={log.reps} onChange={(e) => updateLog(exercise.id, setNumber, { reps: Number(e.target.value) }, log)} /><input type="number" step="0.5" value={log.effort} onChange={(e) => updateLog(exercise.id, setNumber, { effort: Number(e.target.value) }, log)} /><input type="number" min="0" max="10" value={log.pain || 0} onChange={(e) => updateLog(exercise.id, setNumber, { pain: Number(e.target.value), completed: true }, log)} /><strong>{e1rm || '—'}</strong><span>{next}</span></div>; })}</div></div>)}</div><div className="builder-save"><button className="outline-button" onClick={() => setState((s) => ({ ...s, readiness: { ...s.readiness, completed: false } }))}>Finish session / reset readiness</button><small>{state.logs.filter((x) => x.completed).length} sets logged.</small></div></section>;
}

function Range({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) { return <label className="range-row"><span>{label}</span><input type="range" min="0" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} /><b>{value}/10</b></label>; }

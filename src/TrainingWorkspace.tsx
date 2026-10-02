import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile, EffortMode, estimateE1RM, suggestedNextLoad } from './domain';
import { AuthUser, can } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import { exerciseEquipment, exerciseLibrary, exerciseRegions, LibraryExercise } from './exercise-library';

type PlannedExercise = LibraryExercise & { day: string; sets: number; reps: number; load: number; targetEffort: number; substitutions: string[] };
type LoggedSet = { day: string; exerciseId: string; setNumber: number; load: number; reps: number; effort: number; completed: boolean; pain?: number };
type Readiness = { sleep: number; fatigue: number; pain: number; completed: boolean };
type WorkoutHistoryEntry = {
  id: string;
  athleteId: string;
  planId: string;
  day: string;
  completedAt: string;
  mode: EffortMode;
  readiness: Omit<Readiness, 'completed'>;
  sets: LoggedSet[];
};
type TrainingState = {
  athleteId: string;
  planId: string;
  assignedAt?: string;
  assignedBy?: string;
  plan: PlannedExercise[];
  logs: LoggedSet[];
  readiness: Readiness;
  substitutionRequests: string[];
  history: WorkoutHistoryEntry[];
};

const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4'];
const getExercise = (id: string) => exerciseLibrary.find((exercise) => exercise.id === id)!;
const defaultPlan: PlannedExercise[] = [
  { ...getExercise('leg-press'), day: 'Day 1', sets: 3, reps: 8, load: 80, targetEffort: 8, substitutions: ['split-squat', 'hack-squat'] },
  { ...getExercise('rdl'), day: 'Day 1', sets: 3, reps: 8, load: 60, targetEffort: 8, substitutions: ['leg-curl-seated', 'back-extension'] },
];

function initialStateFor(profile: AthleteProfile): TrainingState {
  const plan = profile.trainingMode === 'RIR'
    ? defaultPlan.map((exercise) => ({ ...exercise, targetEffort: convertTarget(exercise.targetEffort) }))
    : defaultPlan;
  return {
    athleteId: profile.id,
    planId: profile.assignedPlanId || `plan-${profile.id}`,
    plan,
    logs: [],
    readiness: { sleep: 7, fatigue: 4, pain: 2, completed: false },
    substitutionRequests: [],
    history: [],
  };
}

function convertTarget(value: number) {
  return Math.max(0, Math.min(10, Math.round((10 - value) * 2) / 2));
}

function historyId() {
  return `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TrainingWorkspace({ profile, setProfile, user, medicalHold = false, restrictions = '', onWorkoutEvent }: {
  profile: AthleteProfile;
  setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>>;
  user: AuthUser;
  medicalHold?: boolean;
  restrictions?: string;
  onWorkoutEvent?: (title: string, detail: string) => void;
}) {
  const canAssign = can(user, 'training:assign') || can(user, 'admin:manage');
  const [view, setView] = useState<'coach' | 'trainee'>(canAssign ? 'coach' : 'trainee');
  const [day, setDay] = useState('Day 1');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [equipment, setEquipment] = useState('All');
  const [state, setState] = useState<TrainingState>(() => initialStateFor(profile));
  const [loaded, setLoaded] = useState(false);
  const repo = useMemo(() => new VersionedRepository<TrainingState>(new BrowserStorageStore(), `training-state:${profile.id}`, 2), [profile.id]);

  useEffect(() => {
    setLoaded(false);
    repo.load().then((saved) => {
      if (saved && saved.athleteId === profile.id) setState(saved);
      else setState(initialStateFor(profile));
      setLoaded(true);
    });
  }, [profile.id, repo]);
  useEffect(() => { if (loaded) repo.save(state); }, [loaded, repo, state]);
  useEffect(() => { if (!canAssign) setView('trainee'); }, [canAssign]);

  const filtered = useMemo(() => exerciseLibrary.filter((exercise) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || exercise.name.toLowerCase().includes(q) || exercise.pattern.toLowerCase().includes(q) || exercise.equipment.toLowerCase().includes(q);
    return (region === 'All' || exercise.region === region) && (equipment === 'All' || exercise.equipment === equipment) && matchesQuery;
  }), [region, equipment, query]);

  const assignedToThisAthlete = Boolean(profile.assignedPlanId && profile.assignedPlanId === state.planId && state.athleteId === profile.id);
  const visiblePlan = canAssign || assignedToThisAthlete ? state.plan : [];
  const dayPlan = visiblePlan.filter((exercise) => exercise.day === day);

  const addExercise = (exercise: LibraryExercise) => {
    if (!canAssign || state.plan.some((planned) => planned.id === exercise.id && planned.day === day)) return;
    setState((current) => ({ ...current, plan: [...current.plan, { ...exercise, day, sets: 3, reps: 10, load: 0, targetEffort: profile.trainingMode === 'RPE' ? 8 : 2, substitutions: [] }] }));
  };

  const patchExercise = (id: string, patch: Partial<PlannedExercise>) => {
    if (!canAssign) return;
    setState((current) => ({ ...current, plan: current.plan.map((exercise) => exercise.id === id && exercise.day === day ? { ...exercise, ...patch } : exercise) }));
  };

  const removeExercise = (id: string) => {
    if (!canAssign) return;
    setState((current) => ({ ...current, plan: current.plan.filter((exercise) => !(exercise.id === id && exercise.day === day)) }));
  };

  const moveExercise = (id: string, direction: -1 | 1) => {
    if (!canAssign) return;
    setState((current) => {
      const indexes = current.plan.map((exercise, index) => ({ exercise, index })).filter(({ exercise }) => exercise.day === day);
      const localIndex = indexes.findIndex(({ exercise }) => exercise.id === id);
      const targetLocalIndex = localIndex + direction;
      if (localIndex < 0 || targetLocalIndex < 0 || targetLocalIndex >= indexes.length) return current;
      const from = indexes[localIndex].index;
      const to = indexes[targetLocalIndex].index;
      const plan = [...current.plan];
      [plan[from], plan[to]] = [plan[to], plan[from]];
      return { ...current, plan };
    });
  };

  const changeMode = (mode: EffortMode) => {
    if (!canAssign || mode === profile.trainingMode) return;
    setState((current) => ({ ...current, plan: current.plan.map((exercise) => ({ ...exercise, targetEffort: convertTarget(exercise.targetEffort) })) }));
    setProfile((current) => ({ ...current, trainingMode: mode }));
  };

  const assignPlan = () => {
    if (!canAssign) return;
    const assignedAt = new Date().toISOString();
    setState((current) => ({ ...current, athleteId: profile.id, assignedAt, assignedBy: user.id }));
    setProfile((current) => ({ ...current, assignedPlanId: state.planId }));
    onWorkoutEvent?.('Coach plan assigned', `${profile.id} · ${state.planId} · ${state.plan.length} exercises`);
  };

  return <div className="training-workspace">
    <section className="module-card training-header"><div><p className="eyebrow">TRAINING SYSTEM</p><h2>{view === 'coach' ? 'Coach Workout Builder' : 'Trainee Workout'}</h2><p>{view === 'coach' ? `Build and assign the program to athlete ${profile.id} without overwriting workout history.` : 'Complete readiness first, then log every set with pain and effort.'}</p></div><div className="builder-toolbar"><button className={view === 'coach' ? 'choice selected' : 'choice'} disabled={!canAssign} onClick={() => canAssign && setView('coach')}>Coach view</button><button className={view === 'trainee' ? 'choice selected' : 'choice'} onClick={() => setView('trainee')}>Trainee view</button></div></section>

    {restrictions && <section className="alert"><strong>Medical restrictions:</strong> {restrictions}</section>}

    <section className="card training-controls"><div className="day-tabs">{days.map((item) => <button key={item} className={day === item ? 'region-button selected' : 'region-button'} onClick={() => setDay(item)}>{item}</button>)}</div><div className="mode-switch compact-switch"><button className={profile.trainingMode === 'RPE' ? 'choice selected' : 'choice'} disabled={!canAssign} onClick={() => changeMode('RPE')}>RPE</button><button className={profile.trainingMode === 'RIR' ? 'choice selected' : 'choice'} disabled={!canAssign} onClick={() => changeMode('RIR')}>RIR</button></div></section>

    {view === 'coach' ? <div className="builder-grid">
      <section className="card library-panel"><div className="panel-title"><div><p className="eyebrow">EXERCISE LIBRARY</p><h3>Add exercises</h3></div><span>{filtered.length} / {exerciseLibrary.length}</span></div><input className="library-search" placeholder="Search exercise, pattern or equipment" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="filter-row">{exerciseRegions.map((item) => <button key={item} className={region === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setRegion(item)}>{item}</button>)}</div><div className="filter-row">{exerciseEquipment.map((item) => <button key={item} className={equipment === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setEquipment(item)}>{item}</button>)}</div><div className="exercise-library-list">{filtered.map((exercise) => { const selected = state.plan.some((planned) => planned.id === exercise.id && planned.day === day); return <div className="library-row" key={exercise.id}><div><strong>{exercise.name}</strong><span>{exercise.region} · {exercise.pattern} · {exercise.equipment}</span></div><button className={selected ? 'add-button added' : 'add-button'} disabled={!canAssign || selected} onClick={() => addExercise(exercise)}>{selected ? '✓' : '+'}</button></div>; })}</div></section>
      <section className="card plan-panel"><div className="panel-title"><div><p className="eyebrow">{day.toUpperCase()}</p><h3>Selected exercises</h3></div><span>{dayPlan.length} selected</span></div>{dayPlan.length === 0 && <div className="empty-state">Use the + button to assign exercises to this day.</div>}<div className="plan-list">{dayPlan.map((exercise, index) => <div className="plan-exercise" key={exercise.id}><div className="plan-exercise-head"><div><span className="exercise-index">{index + 1}</span><strong>{exercise.name}</strong><small>{exercise.pattern} · {exercise.equipment}</small></div><div className="builder-toolbar"><button className="ghost-button" disabled={!canAssign || index === 0} onClick={() => moveExercise(exercise.id, -1)}>↑</button><button className="ghost-button" disabled={!canAssign || index === dayPlan.length - 1} onClick={() => moveExercise(exercise.id, 1)}>↓</button><button className="remove-button" disabled={!canAssign} onClick={() => removeExercise(exercise.id)}>Remove</button></div></div><div className="prescription-grid"><label>Sets<input type="number" min="1" disabled={!canAssign} value={exercise.sets} onChange={(event) => patchExercise(exercise.id, { sets: Number(event.target.value) })} /></label><label>Reps<input type="number" min="1" disabled={!canAssign} value={exercise.reps} onChange={(event) => patchExercise(exercise.id, { reps: Number(event.target.value) })} /></label><label>Starting load<input type="number" min="0" step="0.5" disabled={!canAssign} value={exercise.load} onChange={(event) => patchExercise(exercise.id, { load: Number(event.target.value) })} /></label><label>Target {profile.trainingMode}<input type="number" min="0" max="10" step="0.5" disabled={!canAssign} value={exercise.targetEffort} onChange={(event) => patchExercise(exercise.id, { targetEffort: Number(event.target.value) })} /></label></div><label className="stacked-label">Approved substitutions<select multiple disabled={!canAssign} value={exercise.substitutions} onChange={(event) => patchExercise(exercise.id, { substitutions: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{exerciseLibrary.filter((option) => option.id !== exercise.id && (option.region === exercise.region || option.pattern === exercise.pattern)).map((option) => <option key={option.id} value={option.id}>{option.name} · {option.equipment}</option>)}</select></label></div>)}</div><div className="builder-save"><button className="primary-button" disabled={!canAssign} onClick={assignPlan}>Save & assign to {profile.id}</button><small>{assignedToThisAthlete ? `Assigned ${state.assignedAt ? new Date(state.assignedAt).toLocaleString() : ''}` : 'Draft changes are not visible to the trainee until assigned.'}</small></div></section>
    </div> : medicalHold ? <section className="module-card"><p className="eyebrow">MEDICAL HOLD</p><h2>Medical review required before this workout.</h2><p>Red-flag screening is positive and clearance is pending review, or the athlete has been placed on hold. Workout logging and injury-specific guidance are disabled until medical review updates the clearance status.</p></section> : !assignedToThisAthlete ? <section className="module-card"><p className="eyebrow">NO ACTIVE PROGRAM</p><h2>No coach-assigned program is available.</h2><p>The trainee can only execute a program after the coach assigns it to this athlete profile.</p></section> : <TraineeSession athleteId={profile.id} planId={state.planId} day={day} plan={dayPlan} mode={profile.trainingMode} state={state} setState={setState} onWorkoutEvent={onWorkoutEvent} />}

    <section className="card"><div className="panel-title"><div><p className="eyebrow">WORKOUT HISTORY</p><h3>Completed sessions</h3></div><span>{state.history.length}</span></div>{state.history.length === 0 ? <div className="empty-state">Completed sessions will appear here without overwriting the active program.</div> : <div className="version-list">{state.history.slice().reverse().slice(0, 8).map((session) => <div className="version-row" key={session.id}><span><strong>{session.day}</strong> · {session.sets.length} sets<small>{new Date(session.completedAt).toLocaleString()} · readiness pain {session.readiness.pain}/10 · {session.mode}</small></span></div>)}</div>}</section>
  </div>;
}

function TraineeSession({ athleteId, planId, day, plan, mode, state, setState, onWorkoutEvent }: { athleteId: string; planId: string; day: string; plan: PlannedExercise[]; mode: EffortMode; state: TrainingState; setState: React.Dispatch<React.SetStateAction<TrainingState>>; onWorkoutEvent?: (title: string, detail: string) => void }) {
  const updateLog = (exerciseId: string, setNumber: number, patch: Partial<LoggedSet>, defaults: LoggedSet) => setState((current) => { const exists = current.logs.some((log) => log.day === day && log.exerciseId === exerciseId && log.setNumber === setNumber); return { ...current, logs: exists ? current.logs.map((log) => log.day === day && log.exerciseId === exerciseId && log.setNumber === setNumber ? { ...log, ...patch } : log) : [...current.logs, { ...defaults, ...patch }] }; });
  const getLog = (exercise: PlannedExercise, setNumber: number): LoggedSet => state.logs.find((log) => log.day === day && log.exerciseId === exercise.id && log.setNumber === setNumber) || { day, exerciseId: exercise.id, setNumber, load: exercise.load, reps: exercise.reps, effort: exercise.targetEffort, completed: false, pain: 0 };
  const readinessScore = Math.round(((state.readiness.sleep + (10 - state.readiness.fatigue) + (10 - state.readiness.pain)) / 30) * 100);

  const startWorkout = () => {
    setState((current) => ({ ...current, readiness: { ...current.readiness, completed: true } }));
    onWorkoutEvent?.('Workout started', `${day} · readiness ${readinessScore}% · pain ${state.readiness.pain}/10`);
  };

  const reportSet = (exercise: PlannedExercise, setNumber: number) => {
    const log = getLog(exercise, setNumber);
    const e1rm = estimateE1RM({ load: log.load, reps: log.reps, effort: log.effort }, mode);
    onWorkoutEvent?.('Set logged', `${exercise.name} set ${setNumber} · ${log.load} kg × ${log.reps} · ${mode} ${log.effort} · pain ${log.pain || 0}/10 · e1RM ${e1rm || '—'} kg`);
  };

  const finishWorkout = () => {
    const exerciseIds = new Set(plan.map((exercise) => exercise.id));
    const completedSets = state.logs.filter((log) => log.day === day && exerciseIds.has(log.exerciseId) && log.completed);
    if (!completedSets.length) {
      onWorkoutEvent?.('Workout not saved', `${day} · no completed sets`);
      return;
    }
    const completedAt = new Date().toISOString();
    const history: WorkoutHistoryEntry = {
      id: historyId(), athleteId, planId, day, completedAt, mode,
      readiness: { sleep: state.readiness.sleep, fatigue: state.readiness.fatigue, pain: state.readiness.pain },
      sets: completedSets.map((set) => ({ ...set })),
    };
    onWorkoutEvent?.('Workout completed', `${day} · ${completedSets.length} sets logged`);
    setState((current) => ({
      ...current,
      history: [...current.history, history],
      logs: current.logs.filter((log) => !(log.day === day && exerciseIds.has(log.exerciseId))),
      readiness: { ...current.readiness, completed: false },
    }));
  };

  if (!state.readiness.completed) return <section className="module-card"><p className="eyebrow">PRE-SESSION READINESS</p><h2>Check in before {day}</h2><div className="metric-inputs"><Range label="Sleep" value={state.readiness.sleep} setValue={(value) => setState((current) => ({ ...current, readiness: { ...current.readiness, sleep: value } }))} /><Range label="Fatigue" value={state.readiness.fatigue} setValue={(value) => setState((current) => ({ ...current, readiness: { ...current.readiness, fatigue: value } }))} /><Range label="Current pain" value={state.readiness.pain} setValue={(value) => setState((current) => ({ ...current, readiness: { ...current.readiness, pain: value } }))} /></div><div className="safe-box">Readiness score: {readinessScore}%</div><button className="primary-button" onClick={startWorkout}>Start workout</button></section>;

  return <section className="module-card trainee-session"><p className="eyebrow">ASSIGNED PROGRAM</p><h2>{day}</h2><div className="permission-note">You can log performance and pain. Exercise substitutions remain limited to coach-approved alternatives.</div>{plan.length === 0 && <div className="empty-state">No exercises assigned to this day yet.</div>}<div className="session-exercises">{plan.map((exercise) => <div className="exercise-card session-card" key={exercise.id}><div className="session-title"><div><h3>{exercise.name}</h3><small>{exercise.sets} × {exercise.reps} · Target {mode} {exercise.targetEffort}</small></div>{exercise.substitutions.length ? <select onChange={(event) => event.target.value && setState((current) => ({ ...current, substitutionRequests: [...current.substitutionRequests, `${day}:${exercise.id}:${event.target.value}`] }))}><option value="">Approved substitution</option>{exercise.substitutions.map((id) => <option key={id} value={id}>{exerciseLibrary.find((option) => option.id === id)?.name || 'Unavailable exercise'}</option>)}</select> : <button className="outline-button" disabled>No substitutions</button>}</div><div className="set-table"><div className="set-row set-head"><span>Set</span><span>Load</span><span>Reps</span><span>{mode}</span><span>Pain</span><span>e1RM</span><span>Next</span></div>{Array.from({ length: exercise.sets }, (_, index) => index + 1).map((setNumber) => { const log = getLog(exercise, setNumber); const e1rm = estimateE1RM({ load: log.load, reps: log.reps, effort: log.effort }, mode); const next = suggestedNextLoad({ load: log.load, reps: log.reps, effort: log.effort }, exercise.targetEffort, mode); return <div className="set-row set-row-seven" key={setNumber}><strong>{setNumber}</strong><input type="number" step="0.5" value={log.load} onChange={(event) => updateLog(exercise.id, setNumber, { load: Number(event.target.value) }, log)} /><input type="number" value={log.reps} onChange={(event) => updateLog(exercise.id, setNumber, { reps: Number(event.target.value) }, log)} /><input type="number" step="0.5" value={log.effort} onChange={(event) => updateLog(exercise.id, setNumber, { effort: Number(event.target.value) }, log)} /><input type="number" min="0" max="10" value={log.pain || 0} onChange={(event) => updateLog(exercise.id, setNumber, { pain: Number(event.target.value), completed: true }, log)} onBlur={() => reportSet(exercise, setNumber)} /><strong>{e1rm || '—'}</strong><span>{next}</span></div>; })}</div></div>)}</div><div className="builder-save"><button className="outline-button" onClick={finishWorkout}>Finish session</button><small>{state.logs.filter((log) => log.day === day && log.completed).length} sets logged.</small></div></section>;
}

function Range({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) { return <label className="range-row"><span>{label}</span><input type="range" min="0" max="10" value={value} onChange={(event) => setValue(Number(event.target.value))} /><b>{value}/10</b></label>; }

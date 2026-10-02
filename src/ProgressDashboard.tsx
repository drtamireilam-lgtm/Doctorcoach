import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile, EffortMode, estimateE1RM } from './domain';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import { DoctorCoachState, emptyDoctorCoachState, normalizeDoctorCoachState, readinessScore } from './platform/clinical-data';

type LoggedSet = { day: string; exerciseId: string; setNumber: number; load: number; reps: number; effort: number; completed: boolean; pain?: number };
type PlannedExercise = { id: string; name: string; day: string; sets?: number; targetEffort: number };
type WorkoutHistoryEntry = {
  id: string;
  athleteId: string;
  planId: string;
  day: string;
  completedAt: string;
  mode: EffortMode;
  readiness: { sleep: number; fatigue: number; pain: number };
  sets: LoggedSet[];
};
type TrainingState = {
  athleteId: string;
  planId: string;
  assignedAt?: string;
  assignedBy?: string;
  plan: PlannedExercise[];
  logs: LoggedSet[];
  readiness: { sleep: number; fatigue: number; pain: number; completed: boolean };
  substitutionRequests: string[];
  history: WorkoutHistoryEntry[];
};
type RehabEntry = { id: string; recordedAt: string; exercise: string; painBefore: number; painDuring: number; painAfter: number; painNextDay: number; rom: number; completed: boolean };
type RehabState = { activePhase: number; phases: Array<{ id: string; name: string; target: string; complete: boolean }>; entries: RehabEntry[]; bodyWeight: Array<{ id: string; recordedAt: string; kg: number }> };

type Point = { label: string; value: number };

const store = new BrowserStorageStore();
const clinicalRepo = new VersionedRepository<DoctorCoachState>(store, 'clinical-state', 1);
const rehabRepo = new VersionedRepository<RehabState>(store, 'rehab-state', 1);

const emptyTraining: TrainingState = {
  athleteId: '', planId: '', plan: [], logs: [], readiness: { sleep: 0, fatigue: 0, pain: 0, completed: false }, substitutionRequests: [], history: [],
};
const emptyRehab: RehabState = { activePhase: 0, phases: [], entries: [], bodyWeight: [] };

function workoutReadiness(entry: WorkoutHistoryEntry) {
  return Math.round(((entry.readiness.sleep + (10 - entry.readiness.fatigue) + (10 - entry.readiness.pain)) / 30) * 100);
}

export default function ProgressDashboard({ profile }: { profile: AthleteProfile }) {
  const [clinical, setClinical] = useState(emptyDoctorCoachState);
  const [training, setTraining] = useState(emptyTraining);
  const [rehab, setRehab] = useState(emptyRehab);
  const [exerciseId, setExerciseId] = useState('');

  useEffect(() => {
    const trainingRepo = new VersionedRepository<TrainingState>(store, `training-state:${profile.id}`, 2);
    Promise.all([clinicalRepo.load(), trainingRepo.load(), rehabRepo.load()]).then(([c, t, r]) => {
      setClinical(normalizeDoctorCoachState(c));
      setTraining(t && t.athleteId === profile.id ? t : { ...emptyTraining, athleteId: profile.id });
      if (r) setRehab(r);
    });
  }, [profile.id]);

  const completedSessions = useMemo(
    () => training.history.filter((entry) => entry.athleteId === profile.id).slice().sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    [training.history, profile.id],
  );

  const exerciseOptions = useMemo(() => {
    const ids = new Set<string>();
    completedSessions.forEach((session) => session.sets.forEach((set) => ids.add(set.exerciseId)));
    return Array.from(ids).map((id) => ({ id, name: training.plan.find((exercise) => exercise.id === id)?.name || id }));
  }, [completedSessions, training.plan]);

  useEffect(() => {
    if (!exerciseOptions.length) {
      setExerciseId('');
      return;
    }
    if (!exerciseOptions.some((exercise) => exercise.id === exerciseId)) setExerciseId(exerciseOptions[0].id);
  }, [exerciseId, exerciseOptions]);

  const performance = useMemo(() => {
    if (!exerciseId) return { e1rm: [] as Point[], load: [] as Point[] };
    const e1rm: Point[] = [];
    const load: Point[] = [];
    completedSessions.forEach((session) => {
      const sets = session.sets.filter((set) => set.exerciseId === exerciseId && set.completed);
      if (!sets.length) return;
      const estimates = sets.map((set) => estimateE1RM({ load: set.load, reps: set.reps, effort: set.effort }, session.mode)).filter((value) => value > 0);
      const maxLoad = Math.max(...sets.map((set) => set.load));
      const label = new Date(session.completedAt).toLocaleDateString();
      if (estimates.length) e1rm.push({ label, value: Math.max(...estimates) });
      if (maxLoad > 0) load.push({ label, value: maxLoad });
    });
    return { e1rm, load };
  }, [completedSessions, exerciseId]);

  const workoutReadinessPoints = completedSessions.map((entry) => ({ label: new Date(entry.completedAt).toLocaleDateString(), value: workoutReadiness(entry) }));
  const clinicalReadinessPoints = clinical.readiness.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: readinessScore(entry) }));
  const readiness = workoutReadinessPoints.length ? workoutReadinessPoints : clinicalReadinessPoints;
  const workoutPain = completedSessions.map((entry) => {
    const setPain = entry.sets.map((set) => set.pain || 0);
    return { label: new Date(entry.completedAt).toLocaleDateString(), value: Math.max(entry.readiness.pain, ...setPain) };
  });
  const rehabPain = rehab.entries.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.painNextDay }));
  const pain = workoutPain.length ? workoutPain : rehabPain;
  const rom = rehab.entries.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.rom }));
  const weight = rehab.bodyWeight.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.kg }));

  const totalPrescribedSets = completedSessions.reduce((sum, session) => {
    return sum + training.plan.filter((exercise) => exercise.day === session.day).reduce((daySum, exercise) => daySum + (exercise.sets || 1), 0);
  }, 0);
  const totalCompletedSets = completedSessions.reduce((sum, session) => sum + session.sets.filter((set) => set.completed).length, 0);
  const adherence = totalPrescribedSets ? Math.min(100, Math.round((totalCompletedSets / totalPrescribedSets) * 100)) : 0;

  const latestE1rm = performance.e1rm.length ? performance.e1rm[performance.e1rm.length - 1].value : null;
  const latestLoad = performance.load.length ? performance.load[performance.load.length - 1].value : null;
  const latestWeight = weight.length ? weight[weight.length - 1].value : null;
  const latestPain = pain.length ? pain[pain.length - 1].value : null;
  const latestRom = rom.length ? rom[rom.length - 1].value : null;
  const latestReadiness = readiness.length ? readiness[readiness.length - 1].value : null;
  const selectedExercise = exerciseOptions.find((exercise) => exercise.id === exerciseId);

  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">PROGRESS DASHBOARD</p><h2>Clinical recovery and performance in one view.</h2><p>DoctorCoach combines completed workout history, rehabilitation and clinical tracking without turning trends into automated diagnosis.</p></section>
    <section className="card"><h3>Medical clearance</h3><strong className="big-number">{clinical.medicalClearance.status}</strong><small>{clinical.medicalClearance.restrictions || 'No restrictions recorded'}</small></section>
    <section className="card"><h3>Completed workouts</h3><strong className="big-number">{completedSessions.length}</strong><small>{totalCompletedSets} completed sets stored in history</small></section>
    <section className="card"><h3>Latest e1RM</h3><strong className="big-number">{latestE1rm == null ? '—' : `${latestE1rm} kg`}</strong><small>{selectedExercise ? selectedExercise.name : 'Complete a workout to start tracking'}</small></section>
    <section className="card"><h3>Working load</h3><strong className="big-number">{latestLoad == null ? '—' : `${latestLoad} kg`}</strong><small>{selectedExercise ? `Latest top load · ${selectedExercise.name}` : 'No exercise selected'}</small></section>
    <section className="card"><h3>Readiness</h3><strong className="big-number">{latestReadiness == null ? '—' : `${latestReadiness}%`}</strong><small>{readiness.length} recorded sessions</small></section>
    <section className="card"><h3>Training adherence</h3><strong className="big-number">{adherence}%</strong><small>Completed sets across completed workout sessions</small></section>
    <section className="card"><h3>Body weight</h3><strong className="big-number">{latestWeight == null ? '—' : `${latestWeight} kg`}</strong><small>{weight.length} entries</small></section>
    <section className="card"><h3>Pain / ROM</h3><strong className="big-number">{latestPain == null ? '—' : `${latestPain}/10`}</strong><small>{latestRom == null ? 'No ROM yet' : `Latest ROM ${latestRom}°`}</small></section>

    <section className="card">
      <div className="panel-title"><div><p className="eyebrow">PERFORMANCE TREND</p><h3>Exercise</h3></div><span>{completedSessions.length} sessions</span></div>
      {exerciseOptions.length === 0 ? <div className="empty-state">Finish a workout to unlock exercise-specific performance trends.</div> : <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>{exerciseOptions.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select>}
    </section>

    <ChartCard title="e1RM" points={performance.e1rm.slice(-12)} suffix="kg" />
    <ChartCard title="Working load" points={performance.load.slice(-12)} suffix="kg" />
    <ChartCard title="Readiness" points={readiness.slice(-12)} suffix="%" />
    <ChartCard title="Workout pain" points={pain.slice(-12)} suffix="/10" invert />
    <ChartCard title="ROM" points={rom.slice(-12)} suffix="°" />
    <ChartCard title="Body weight" points={weight.slice(-12)} suffix="kg" />

    <section className="module-card"><p className="eyebrow">WORKOUT HISTORY</p><h2>Recent completed sessions</h2>{completedSessions.length === 0 ? <div className="empty-state">No completed workouts yet.</div> : <div className="timeline-list">{completedSessions.slice().reverse().slice(0, 12).map((session) => <div className="timeline-event" key={session.id}><div><strong>{session.day}</strong><span>{session.sets.length} sets · readiness {workoutReadiness(session)}% · pain {Math.max(session.readiness.pain, ...session.sets.map((set) => set.pain || 0))}/10</span></div><small>{new Date(session.completedAt).toLocaleString()}</small></div>)}</div>}</section>

    <section className="module-card"><p className="eyebrow">CLIENT TIMELINE</p><h2>Recent coordinated events</h2>{clinical.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : <div className="timeline-list">{clinical.timeline.slice(0, 16).map((event) => <div className="timeline-event" key={event.id}><div><strong>{event.title}</strong><span>{event.detail}</span></div><small>{new Date(event.occurredAt).toLocaleString()}</small></div>)}</div>}</section>
  </div>;
}

function ChartCard({ title, points, suffix, invert = false }: { title: string; points: Point[]; suffix: string; invert?: boolean }) {
  const values = points.map((p) => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = Math.max(1, max - min);
  const coords = points.map((point, i) => {
    const x = points.length <= 1 ? 50 : (i / (points.length - 1)) * 100;
    const normalized = (point.value - min) / span;
    const y = invert ? 10 + normalized * 80 : 90 - normalized * 80;
    return `${x},${y}`;
  }).join(' ');
  const latest = points.length ? points[points.length - 1].value : null;
  return <section className="card progress-chart-card"><div className="panel-title"><h3>{title}</h3><strong>{latest == null ? '—' : `${latest}${suffix}`}</strong></div>{points.length < 2 ? <div className="empty-state">Log more entries to see a trend.</div> : <><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="progress-svg"><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="chart-labels"><span>{points[0].label}</span><span>{points[points.length - 1].label}</span></div></>}</section>;
}

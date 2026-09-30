import React, { useEffect, useMemo, useState } from 'react';
import { AthleteProfile, estimateE1RM } from './domain';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';
import { DoctorCoachState, emptyDoctorCoachState, readinessScore } from './platform/clinical-data';

type LoggedSet = { exerciseId: string; setNumber: number; load: number; reps: number; effort: number; completed: boolean; pain?: number };
type TrainingState = { plan: Array<{ id: string; name: string; day: string; targetEffort: number }>; logs: LoggedSet[]; readiness: { sleep: number; fatigue: number; pain: number; completed: boolean }; substitutionRequests: string[] };
type RehabEntry = { id: string; recordedAt: string; exercise: string; painBefore: number; painDuring: number; painAfter: number; painNextDay: number; rom: number; completed: boolean };
type RehabState = { activePhase: number; phases: Array<{ id: string; name: string; target: string; complete: boolean }>; entries: RehabEntry[]; bodyWeight: Array<{ id: string; recordedAt: string; kg: number }> };

const store = new BrowserStorageStore();
const clinicalRepo = new VersionedRepository<DoctorCoachState>(store, 'clinical-state', 1);
const trainingRepo = new VersionedRepository<TrainingState>(store, 'training-state', 1);
const rehabRepo = new VersionedRepository<RehabState>(store, 'rehab-state', 1);

const emptyTraining: TrainingState = { plan: [], logs: [], readiness: { sleep: 0, fatigue: 0, pain: 0, completed: false }, substitutionRequests: [] };
const emptyRehab: RehabState = { activePhase: 0, phases: [], entries: [], bodyWeight: [] };

export default function ProgressDashboard({ profile }: { profile: AthleteProfile }) {
  const [clinical, setClinical] = useState(emptyDoctorCoachState);
  const [training, setTraining] = useState(emptyTraining);
  const [rehab, setRehab] = useState(emptyRehab);

  useEffect(() => {
    Promise.all([clinicalRepo.load(), trainingRepo.load(), rehabRepo.load()]).then(([c, t, r]) => {
      if (c) setClinical(c);
      if (t) setTraining(t);
      if (r) setRehab(r);
    });
  }, []);

  const readiness = clinical.readiness.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: readinessScore(entry) }));
  const pain = rehab.entries.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.painNextDay }));
  const rom = rehab.entries.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.rom }));
  const weight = rehab.bodyWeight.map((entry) => ({ label: new Date(entry.recordedAt).toLocaleDateString(), value: entry.kg }));

  const e1rm = useMemo(() => training.logs.filter((x) => x.completed).map((set, index) => ({ label: `${set.exerciseId} #${index + 1}`, value: estimateE1RM({ load: set.load, reps: set.reps, effort: set.effort }, profile.trainingMode) })).filter((x) => x.value > 0), [training.logs, profile.trainingMode]);
  const adherence = training.plan.length ? Math.round((training.logs.filter((x) => x.completed).length / Math.max(1, training.plan.reduce((sum: number, item: any) => sum + (item.sets || 1), 0))) * 100) : 0;
  const latestE1rm = e1rm.length ? e1rm[e1rm.length - 1].value : null;
  const latestWeight = weight.length ? weight[weight.length - 1].value : null;
  const latestPain = pain.length ? pain[pain.length - 1].value : null;
  const latestRom = rom.length ? rom[rom.length - 1].value : null;

  return <div className="content-grid">
    <section className="hero-card"><p className="eyebrow">PROGRESS DASHBOARD</p><h2>Clinical recovery and performance in one view.</h2><p>DoctorCoach combines training, rehabilitation and clinical tracking without turning trends into automated diagnosis.</p></section>
    <section className="card"><h3>Latest e1RM</h3><strong className="big-number">{latestE1rm == null ? '—' : `${latestE1rm} kg`}</strong><small>{e1rm.length} logged performance points</small></section>
    <section className="card"><h3>Training adherence</h3><strong className="big-number">{adherence}%</strong><small>Completed logged sets vs prescribed structure</small></section>
    <section className="card"><h3>Body weight</h3><strong className="big-number">{latestWeight == null ? '—' : `${latestWeight} kg`}</strong><small>{weight.length} entries</small></section>
    <section className="card"><h3>Pain / ROM</h3><strong className="big-number">{latestPain == null ? '—' : `${latestPain}/10`}</strong><small>{latestRom == null ? 'No ROM yet' : `Latest ROM ${latestRom}°`}</small></section>

    <ChartCard title="e1RM" points={e1rm.slice(-12)} suffix="kg" />
    <ChartCard title="Readiness" points={readiness.slice(-12)} suffix="%" />
    <ChartCard title="Next-day pain" points={pain.slice(-12)} suffix="/10" invert />
    <ChartCard title="ROM" points={rom.slice(-12)} suffix="°" />
    <ChartCard title="Body weight" points={weight.slice(-12)} suffix="kg" />

    <section className="module-card"><p className="eyebrow">CLIENT TIMELINE</p><h2>Recent coordinated events</h2>{clinical.timeline.length === 0 ? <div className="empty-state">No timeline events yet.</div> : <div className="timeline-list">{clinical.timeline.slice(0, 16).map((event) => <div className="timeline-event" key={event.id}><div><strong>{event.title}</strong><span>{event.detail}</span></div><small>{new Date(event.occurredAt).toLocaleString()}</small></div>)}</div>}</section>
  </div>;
}

function ChartCard({ title, points, suffix, invert = false }: { title: string; points: Array<{ label: string; value: number }>; suffix: string; invert?: boolean }) {
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

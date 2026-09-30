import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AthleteProfile, EffortMode, Section, bodyRegions, estimateE1RM, hasRedFlags, initialIntake, suggestedNextLoad } from './domain';

const sections: Array<{ id: Section; label: string; subtitle: string }> = [
  { id: 'home', label: 'Dashboard', subtitle: 'Your care and performance hub' },
  { id: 'medical', label: 'Medical', subtitle: 'Assessment, safety and injury review' },
  { id: 'training', label: 'Training', subtitle: 'Coach-assigned plan, RPE / RIR and e1RM' },
  { id: 'nutrition', label: 'Nutrition', subtitle: 'Plan, adherence and dietitian follow-up' },
  { id: 'progress', label: 'Progress', subtitle: 'Weight, pain, ROM and performance trends' },
  { id: 'education', label: 'Anatomy & Learn', subtitle: 'Body map, anatomy and injury education' },
  { id: 'team', label: 'Team', subtitle: 'Medical, training and nutrition professionals' },
];

const initialProfile: AthleteProfile = { id: 'demo-athlete', intake: initialIntake, trainingMode: 'RPE', assignedPlanId: 'nadav-demo-a' };

function App() {
  const [section, setSection] = useState<Section>('home');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile);
  const redFlags = hasRedFlags(profile.intake);
  const active = useMemo(() => sections.find((item) => item.id === section)!, [section]);

  const updateIntake = (patch: Partial<AthleteProfile['intake']>) => setProfile((p) => ({ ...p, intake: { ...p.intake, ...patch } }));
  const selectBodyRegion = (region: string) => setProfile((p) => ({ ...p, selectedBodyRegion: region, intake: { ...p.intake, injuryRegion: region } }));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">DC</div><div><strong>DoctorCoach</strong><span>Medicine × Training × Nutrition</span></div></div>
      <nav>{sections.map((item) => <button key={item.id} className={section === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item.id)}><span>{item.label}</span><small>{item.subtitle}</small></button>)}</nav>
      <div className="sidebar-footer"><span className="status-dot" /> Team-connected care</div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div><p className="eyebrow">DOCTORCOACH</p><h1>{active.label}</h1><p>{active.subtitle}</p></div><button className="outline-button" onClick={() => { setShowOnboarding(true); setStep(0); }}>Run onboarding</button></header>
      {section === 'home' && <Dashboard redFlags={redFlags} profile={profile} onGo={setSection} />}
      {section === 'medical' && <Medical profile={profile} updateIntake={updateIntake} />}
      {section === 'training' && <Training profile={profile} setProfile={setProfile} />}
      {section === 'nutrition' && <Module title="Nutrition" text="Dietitian-led nutrition planning linked to body-weight and training data." items={['Nutrition assessment', 'Calories/macros or flexible principles', 'Training-day vs rest-day plan', 'Daily adherence check-in', 'Weekly dietitian check-in']} />}
      {section === 'progress' && <Module title="Progress" text="One dashboard for rehabilitation and performance trends." items={['Body weight', 'Working load and e1RM', 'Pain before/during/after/next day', 'ROM tracking', 'Readiness trends']} />}
      {section === 'education' && <Education profile={profile} selectBodyRegion={selectBodyRegion} />}
      {section === 'team' && <Module title="Meet the Team" text="A coordinated care model with discipline-specific notes and a shared team dashboard." items={['Tamir Eilam · Medical', 'Nadav Ron · Training', 'Lior Zelikson · Nutrition', 'Internal notes and mentions', 'Appointments and support']} />}
    </main>

    {showOnboarding && <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} close={() => setShowOnboarding(false)} complete={() => { setShowOnboarding(false); setSection(redFlags ? 'medical' : 'home'); }} />}
  </div>;
}

function Onboarding({ profile, setProfile, step, setStep, close, complete }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>>; step: number; setStep: React.Dispatch<React.SetStateAction<number>>; close: () => void; complete: () => void }) {
  const intake = profile.intake;
  const update = (patch: Partial<typeof intake>) => setProfile((p) => ({ ...p, intake: { ...p.intake, ...patch } }));
  const redFlags = hasRedFlags(intake);
  const next = () => setStep((v) => Math.min(v + 1, 4));
  const back = () => setStep((v) => Math.max(v - 1, 0));
  return <div className="modal-backdrop"><div className="modal-card"><div className="step-line"><span style={{ width: `${(step + 1) * 20}%` }} /></div>
    {step === 0 && <><p className="eyebrow">WELCOME</p><h2>One profile. One coordinated plan.</h2><p>DoctorCoach connects medical assessment, injury-aware training, nutrition and progress tracking under one shared athlete profile.</p><div className="feature-grid compact"><Mini title="Medical" text="Safety screening and injury review" /><Mini title="Training" text="Coach-assigned programming" /><Mini title="Nutrition" text="Dietitian-led planning" /><Mini title="Progress" text="Pain, ROM, body weight and e1RM" /></div></>}
    {step === 1 && <><p className="eyebrow">INJURY INTAKE</p><h2>Do you currently have an injury?</h2><div className="choice-row"><button className={intake.injured === true ? 'choice selected' : 'choice'} onClick={() => update({ injured: true })}>Yes</button><button className={intake.injured === false ? 'choice selected' : 'choice'} onClick={() => update({ injured: false })}>No</button></div>{intake.injured && <div className="form-grid"><select value={intake.injuryRegion} onChange={(e) => update({ injuryRegion: e.target.value })}><option value="">Body region</option>{bodyRegions.map((r) => <option key={r}>{r}</option>)}</select><select value={intake.side} onChange={(e) => update({ side: e.target.value as any })}><option value="">Side</option><option value="left">Left</option><option value="right">Right</option><option value="central">Central</option></select><input placeholder="When did it start?" value={intake.onset} onChange={(e) => update({ onset: e.target.value })} /><input placeholder="Mechanism / what happened?" value={intake.mechanism} onChange={(e) => update({ mechanism: e.target.value })} /><label>Current pain 0–10<input type="range" min="0" max="10" value={intake.painNow} onChange={(e) => update({ painNow: Number(e.target.value) })} /><b>{intake.painNow}/10</b></label><label>Worst pain 0–10<input type="range" min="0" max="10" value={intake.painWorst} onChange={(e) => update({ painWorst: Number(e.target.value) })} /><b>{intake.painWorst}/10</b></label></div>}</>}
    {step === 2 && <><p className="eyebrow">RED FLAGS</p><h2>Safety screening</h2><p>Positive answers do not create a diagnosis. They route the user to medical review.</p><div className="check-list">{[
      ['numbnessWeakness', 'New or rapidly worsening numbness / weakness'],
      ['bowelBladderChange', 'New bowel or bladder dysfunction / saddle symptoms'],
      ['majorTrauma', 'Major trauma or suspected fracture'],
      ['chestPainSyncope', 'Chest pain, fainting or unexplained shortness of breath'],
      ['feverUnexplainedSymptoms', 'Fever, unexplained weight loss or severe systemic symptoms'],
      ['unableToBearWeight', 'Unable to bear weight or use the affected limb'],
    ].map(([key, label]) => <label className="check-card" key={key}><input type="checkbox" checked={Boolean(intake[key as keyof typeof intake])} onChange={(e) => update({ [key]: e.target.checked } as any)} /><span>{label}</span></label>)}</div>{redFlags && <div className="alert">Medical Review required before the app gives injury-specific training guidance.</div>}</>}
    {step === 3 && <><p className="eyebrow">SHARED PROFILE</p><h2>Build the team intake</h2><div className="form-grid"><input placeholder="Age" value={intake.age} onChange={(e) => update({ age: e.target.value })} /><input placeholder="Training frequency" value={intake.frequency} onChange={(e) => update({ frequency: e.target.value })} /><input placeholder="Training style / discipline" value={intake.style} onChange={(e) => update({ style: e.target.value })} /><input placeholder="Primary goals" value={intake.goals} onChange={(e) => update({ goals: e.target.value })} /><textarea placeholder="Relevant medical history" value={intake.medicalHistory} onChange={(e) => update({ medicalHistory: e.target.value })} /><textarea placeholder="Current medications" value={intake.medications} onChange={(e) => update({ medications: e.target.value })} /><textarea placeholder="Prior injuries / surgeries" value={intake.priorInjuries} onChange={(e) => update({ priorInjuries: e.target.value })} /><textarea placeholder="Restrictions from physician / physiotherapist" value={intake.restrictions} onChange={(e) => update({ restrictions: e.target.value })} /></div></>}
    {step === 4 && <><p className="eyebrow">QUICK TOUR</p><h2>You are ready to enter DoctorCoach</h2><div className="timeline"><div><b>1</b><span>Use the body map to select the painful region and side.</span></div><div><b>2</b><span>Medical review defines safety restrictions when needed.</span></div><div><b>3</b><span>Nadav assigns the training plan; the trainee logs load, reps and RPE/RIR.</span></div><div><b>4</b><span>Track pain, ROM, body weight and e1RM over time.</span></div></div>{redFlags && <div className="alert">Your first destination will be Medical Review.</div>}</>}
    <div className="modal-actions"><button className="ghost-button" onClick={step === 0 ? close : back}>{step === 0 ? 'Skip for now' : 'Back'}</button>{step < 4 ? <button className="primary-button" onClick={next}>Continue</button> : <button className="primary-button" onClick={complete}>Enter DoctorCoach</button>}</div>
  </div></div>;
}

function Dashboard({ redFlags, profile, onGo }: { redFlags: boolean; profile: AthleteProfile; onGo: (s: Section) => void }) {
  return <div className="content-grid"><section className="hero-card"><p className="eyebrow">TODAY</p><h2>Your plan adapts to injury, performance and recovery.</h2><p>One shared profile connects medical restrictions, coach programming and nutrition follow-up.</p><div className="hero-actions"><button className="primary-button" onClick={() => onGo(redFlags ? 'medical' : 'training')}>{redFlags ? 'Open medical review' : 'Open today’s workout'}</button><button className="outline-button" onClick={() => onGo('education')}>Open body map</button></div></section><section className="card"><h3>Profile status</h3><p>{profile.intake.injured ? `Injury: ${profile.intake.injuryRegion || 'region not selected'}` : 'No current injury recorded'}</p><p>{redFlags ? '⚠ Medical review required' : '✓ No red flags recorded'}</p></section><section className="card"><h3>Training access</h3><p>Assigned plan: {profile.assignedPlanId ? 'Active' : 'None'}</p><small>Trainees cannot freely build a coached plan. Self-programming will be a separate paid mode.</small></section></div>;
}

function Medical({ profile, updateIntake }: { profile: AthleteProfile; updateIntake: (p: Partial<AthleteProfile['intake']>) => void }) {
  const i = profile.intake; const red = hasRedFlags(i);
  return <div className="content-grid"><section className="module-card"><p className="eyebrow">MEDICAL REVIEW</p><h2>Structured injury overview</h2><div className="summary-grid"><Mini title="Region" text={i.injuryRegion || 'Not selected'} /><Mini title="Side" text={i.side || 'Not selected'} /><Mini title="Pain now" text={`${i.painNow}/10`} /><Mini title="Worst pain" text={`${i.painWorst}/10`} /></div>{red ? <div className="alert">Red flag screening is positive. Keep this case in Medical Review before injury-specific exercise guidance.</div> : <div className="safe-box">No red flags are currently marked.</div>}<textarea className="wide-textarea" placeholder="Shared medical restrictions / instructions for the training team" value={i.restrictions} onChange={(e) => updateIntake({ restrictions: e.target.value })} /></section></div>;
}

function Education({ profile, selectBodyRegion }: { profile: AthleteProfile; selectBodyRegion: (region: string) => void }) {
  return <div className="content-grid"><section className="module-card body-map-card"><p className="eyebrow">BODY MAP</p><h2>Select a region</h2><div className="body-map"><div className="silhouette">◯<div>│</div><div>╱│╲</div><div>│</div><div>╱ ╲</div></div><div className="region-list">{bodyRegions.map((r) => <button key={r} className={profile.selectedBodyRegion === r ? 'region-button selected' : 'region-button'} onClick={() => selectBodyRegion(r)}>{r}</button>)}</div></div>{profile.selectedBodyRegion && <div className="selected-panel"><strong>{profile.selectedBodyRegion}</strong><span>Next: anatomy, common injury patterns, rehab phases and contextual feedback.</span></div>}</section></div>;
}

function Training({ profile, setProfile }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>> }) {
  const [reps, setReps] = useState(8); const [load, setLoad] = useState(80); const [effort, setEffort] = useState(profile.trainingMode === 'RPE' ? 8 : 2); const target = profile.trainingMode === 'RPE' ? 8 : 2;
  const set = { reps, load, effort }; const e1rm = estimateE1RM(set, profile.trainingMode); const suggested = suggestedNextLoad(set, target, profile.trainingMode);
  const changeMode = (mode: EffortMode) => { setProfile((p) => ({ ...p, trainingMode: mode })); setEffort(mode === 'RPE' ? 8 : 2); };
  return <div className="content-grid"><section className="module-card"><p className="eyebrow">COACH-ASSIGNED PLAN</p><h2>Workout A · Lower body</h2><div className="permission-note">This plan is assigned by the coach. Trainees can log performance but cannot replace the coached program unless a substitution is approved.</div><div className="mode-switch"><button className={profile.trainingMode === 'RPE' ? 'choice selected' : 'choice'} onClick={() => changeMode('RPE')}>RPE</button><button className={profile.trainingMode === 'RIR' ? 'choice selected' : 'choice'} onClick={() => changeMode('RIR')}>RIR</button></div><div className="exercise-card"><div><p className="eyebrow">EXERCISE 1</p><h3>Leg Press</h3><small>Target: 3 × 8 · {profile.trainingMode} {target}</small></div><div className="set-grid"><label>Load (kg)<input type="number" value={load} onChange={(e) => setLoad(Number(e.target.value))} /></label><label>Reps<input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} /></label><label>{profile.trainingMode}<input type="number" step="0.5" min="0" max="10" value={effort} onChange={(e) => setEffort(Number(e.target.value))} /></label></div><div className="calculation-strip"><div><span>Estimated 1RM</span><strong>{e1rm || '—'} kg</strong></div><div><span>Next-set suggestion</span><strong>{suggested}</strong></div></div></div></section></div>;
}

function Module({ title, text, items }: { title: string; text: string; items: string[] }) { return <section className="module-card"><p className="eyebrow">MODULE</p><h2>{title}</h2><p>{text}</p><div className="feature-grid">{items.map((item) => <Mini key={item} title={item} text="Planned in the DoctorCoach roadmap" />)}</div></section>; }
function Mini({ title, text }: { title: string; text: string }) { return <div className="mini-card"><strong>{title}</strong><span>{text}</span></div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

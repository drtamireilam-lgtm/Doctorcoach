import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './integrated-care.css';
import TrainingIntegrated from './TrainingIntegrated';
import IntegratedCareWorkspace from './IntegratedCareWorkspace';
import RehabWorkspace from './RehabWorkspace';
import TeamNutritionWorkspace from './TeamNutritionWorkspace';
import ServicesEducationWorkspace from './ServicesEducationWorkspace';
import ProgressDashboard from './ProgressDashboard';
import PilotWorkspace from './PilotWorkspace';
import HomeDashboard from './HomeDashboard';
import { AthleteProfile, Section, bodyRegions, hasRedFlags, initialIntake } from './domain';
import { AuthUser } from './platform/auth';
import { BrowserStorageStore, VersionedRepository } from './platform/persistence';

const sections: Array<{ id: Section; label: string; subtitle: string }> = [
  { id: 'home', label: 'Dashboard', subtitle: 'What you need to do today' },
  { id: 'medical', label: 'Medical', subtitle: 'Assessment, clearance and safety review' },
  { id: 'rehabilitation', label: 'Rehabilitation', subtitle: 'Injury journey, pain, ROM and milestones' },
  { id: 'training', label: 'Training', subtitle: 'Coach-assigned plan, RPE / RIR, e1RM and video review' },
  { id: 'nutrition', label: 'Nutrition', subtitle: 'Assessment, plan, adherence and dietitian follow-up' },
  { id: 'progress', label: 'Progress', subtitle: 'e1RM, readiness, pain, ROM, weight and timeline' },
  { id: 'education', label: 'Anatomy & Learn', subtitle: 'Region, muscle, injury relevance and education' },
  { id: 'team', label: 'Team', subtitle: 'Shared dashboard, queues, notes and mentions' },
  { id: 'appointments', label: 'Appointments', subtitle: 'Consultations, subscriptions and service access' },
  { id: 'pilot', label: 'Pilot', subtitle: 'Cohort, consent, feature flags and feedback' },
];

const initialProfile: AthleteProfile = { id: 'demo-athlete', intake: initialIntake, trainingMode: 'RPE', assignedPlanId: 'nadav-demo-a' };
const profileRepo = new VersionedRepository<AthleteProfile>(new BrowserStorageStore(), 'athlete-profile', 1);

const demoUsers: Record<string, AuthUser> = {
  trainee: { id: 'demo-trainee', email: 'trainee@doctorcoach.demo', displayName: 'Demo Trainee', roles: ['trainee'], athleteId: 'demo-athlete' },
  coach: { id: 'demo-coach', email: 'coach@doctorcoach.demo', displayName: 'Nadav · Coach Demo', roles: ['coach'] },
  medical: { id: 'demo-medical', email: 'medical@doctorcoach.demo', displayName: 'Tamir · Medical Demo', roles: ['medical'] },
  dietitian: { id: 'demo-dietitian', email: 'nutrition@doctorcoach.demo', displayName: 'Lior · Dietitian Demo', roles: ['dietitian'] },
  admin: { id: 'demo-admin', email: 'admin@doctorcoach.demo', displayName: 'Admin Demo', roles: ['admin'], athleteId: 'demo-athlete' },
};

function App() {
  const [section, setSection] = useState<Section>('home');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<AuthUser>(demoUsers.admin);
  const redFlags = hasRedFlags(profile.intake);
  const active = useMemo(() => sections.find((item) => item.id === section)!, [section]);

  useEffect(() => { profileRepo.load().then((saved) => { if (saved) setProfile(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) profileRepo.save(profile); }, [loaded, profile]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">DC</div><div><strong>DoctorCoach</strong><span>Medicine × Training × Nutrition</span></div></div>
      <nav>{sections.map((item) => <button key={item.id} className={section === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item.id)}><span>{item.label}</span><small>{item.subtitle}</small></button>)}</nav>
      <div className="role-box"><small>Demo role</small><select value={user.roles[0]} onChange={(e) => setUser(demoUsers[e.target.value])}>{Object.keys(demoUsers).map((role) => <option key={role} value={role}>{role}</option>)}</select><span>{user.displayName}</span></div>
      <div className="sidebar-footer"><span className="status-dot" /> Persisted MVP · pilot controls enabled</div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div><p className="eyebrow">DOCTORCOACH</p><h1>{active.label}</h1><p>{active.subtitle}</p></div><button className="outline-button" onClick={() => { setShowOnboarding(true); setStep(0); }}>Run onboarding</button></header>
      {section === 'home' && <HomeDashboard redFlags={redFlags} profile={profile} onGo={setSection} user={user} />}
      {section === 'medical' && <IntegratedCareWorkspace mode="medical" profile={profile} user={user} updateProfile={setProfile} />}
      {section === 'rehabilitation' && <RehabWorkspace profile={profile} />}
      {section === 'training' && <TrainingIntegrated profile={profile} setProfile={setProfile} user={user} />}
      {section === 'nutrition' && <TeamNutritionWorkspace mode="nutrition" profile={profile} user={user} />}
      {section === 'progress' && <ProgressDashboard profile={profile} />}
      {section === 'education' && <ServicesEducationWorkspace mode="education" profile={profile} />}
      {section === 'team' && <TeamNutritionWorkspace mode="team" profile={profile} user={user} />}
      {section === 'appointments' && <ServicesEducationWorkspace mode="appointments" profile={profile} />}
      {section === 'pilot' && <PilotWorkspace profile={profile} user={user} />}
    </main>

    {showOnboarding && <Onboarding profile={profile} setProfile={setProfile} step={step} setStep={setStep} close={() => setShowOnboarding(false)} complete={() => { setShowOnboarding(false); setSection(hasRedFlags(profile.intake) ? 'medical' : 'home'); }} />}
  </div>;
}

function Onboarding({ profile, setProfile, step, setStep, close, complete }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>>; step: number; setStep: React.Dispatch<React.SetStateAction<number>>; close: () => void; complete: () => void }) {
  const intake = profile.intake;
  const update = (patch: Partial<typeof intake>) => setProfile((p) => ({ ...p, intake: { ...p.intake, ...patch } }));
  const redFlags = hasRedFlags(intake);
  const next = () => setStep((v) => Math.min(v + 1, 4));
  const back = () => setStep((v) => Math.max(v - 1, 0));
  return <div className="modal-backdrop"><div className="modal-card"><div className="step-line"><span style={{ width: `${(step + 1) * 20}%` }} /></div>
    {step === 0 && <><p className="eyebrow">WELCOME</p><h2>One profile. One coordinated plan.</h2><p>DoctorCoach connects medical assessment, injury-aware training, nutrition, education, appointments and progress under one shared athlete profile.</p></>}
    {step === 1 && <><p className="eyebrow">INJURY INTAKE</p><h2>Do you currently have an injury?</h2><div className="choice-row"><button className={intake.injured === true ? 'choice selected' : 'choice'} onClick={() => update({ injured: true })}>Yes</button><button className={intake.injured === false ? 'choice selected' : 'choice'} onClick={() => update({ injured: false })}>No</button></div>{intake.injured && <div className="form-grid"><select value={intake.injuryRegion} onChange={(e) => update({ injuryRegion: e.target.value })}><option value="">Body region</option>{bodyRegions.map((r) => <option key={r}>{r}</option>)}</select><select value={intake.side} onChange={(e) => update({ side: e.target.value as any })}><option value="">Side</option><option value="left">Left</option><option value="right">Right</option><option value="central">Central</option></select><input placeholder="When did it start?" value={intake.onset} onChange={(e) => update({ onset: e.target.value })} /><input placeholder="Mechanism / what happened?" value={intake.mechanism} onChange={(e) => update({ mechanism: e.target.value })} /><RangeInput label="Current pain" value={intake.painNow} setValue={(value) => update({ painNow: value })} /><RangeInput label="Worst pain" value={intake.painWorst} setValue={(value) => update({ painWorst: value })} /></div>}</>}
    {step === 2 && <><p className="eyebrow">RED FLAGS</p><h2>Safety screening</h2><div className="check-list">{[['numbnessWeakness','New or rapidly worsening numbness / weakness'],['bowelBladderChange','New bowel or bladder dysfunction / saddle symptoms'],['majorTrauma','Major trauma or suspected fracture'],['chestPainSyncope','Chest pain, fainting or unexplained shortness of breath'],['feverUnexplainedSymptoms','Fever, unexplained weight loss or severe systemic symptoms'],['unableToBearWeight','Unable to bear weight or use the affected limb']].map(([key,label]) => <label className="check-card" key={key}><input type="checkbox" checked={Boolean(intake[key as keyof typeof intake])} onChange={(e) => update({ [key]: e.target.checked } as any)} /><span>{label}</span></label>)}</div>{redFlags && <div className="alert">Medical Review required before injury-specific automated guidance.</div>}</>}
    {step === 3 && <><p className="eyebrow">SHARED PROFILE</p><h2>Build the team intake</h2><div className="form-grid"><input placeholder="Age" value={intake.age} onChange={(e) => update({ age: e.target.value })} /><input placeholder="Training frequency" value={intake.frequency} onChange={(e) => update({ frequency: e.target.value })} /><input placeholder="Training style / discipline" value={intake.style} onChange={(e) => update({ style: e.target.value })} /><input placeholder="Primary goals" value={intake.goals} onChange={(e) => update({ goals: e.target.value })} /><textarea placeholder="Relevant medical history" value={intake.medicalHistory} onChange={(e) => update({ medicalHistory: e.target.value })} /><textarea placeholder="Current medications" value={intake.medications} onChange={(e) => update({ medications: e.target.value })} /><textarea placeholder="Prior injuries / surgeries" value={intake.priorInjuries} onChange={(e) => update({ priorInjuries: e.target.value })} /><textarea placeholder="Restrictions from physician / physiotherapist" value={intake.restrictions} onChange={(e) => update({ restrictions: e.target.value })} /></div></>}
    {step === 4 && <><p className="eyebrow">READY</p><h2>Your DoctorCoach profile is connected.</h2><div className="timeline"><div><b>1</b><span>Medical review controls safety and clearance.</span></div><div><b>2</b><span>Rehabilitation and Training collect pain, ROM, readiness, performance and optional set-video review.</span></div><div><b>3</b><span>Progress consolidates e1RM, pain, ROM, weight and readiness trends.</span></div><div><b>4</b><span>Pilot mode versions consent, controls feature rollout and collects feedback before production.</span></div></div></>}
    <div className="modal-actions"><button className="ghost-button" onClick={step === 0 ? close : back}>{step === 0 ? 'Skip for now' : 'Back'}</button>{step < 4 ? <button className="primary-button" onClick={next}>Continue</button> : <button className="primary-button" onClick={complete}>Enter DoctorCoach</button>}</div>
  </div></div>;
}

function Dashboard({ redFlags, profile, onGo, user }: { redFlags: boolean; profile: AthleteProfile; onGo: (s: Section) => void; user: AuthUser }) {
  return <div className="content-grid"><section className="hero-card"><p className="eyebrow">TODAY</p><h2>Your plan adapts to injury, performance and recovery.</h2><p>The MVP connects medical, rehab, training, progress, video review, nutrition, team collaboration, education, appointments and controlled pilot testing.</p><div className="hero-actions"><button className="primary-button" onClick={() => onGo(redFlags ? 'medical' : profile.intake.injured ? 'rehabilitation' : 'training')}>{redFlags ? 'Open medical review' : profile.intake.injured ? 'Open rehabilitation' : 'Open today’s workout'}</button><button className="outline-button" onClick={() => onGo('progress')}>Progress</button><button className="outline-button" onClick={() => onGo('pilot')}>Pilot controls</button></div></section><section className="card"><h3>Signed-in demo role</h3><p>{user.displayName}</p><small>Demo auth remains development-only. Production authorization must be enforced server-side.</small></section><section className="card"><h3>Profile status</h3><p>{profile.intake.injured ? `Injury: ${profile.intake.injuryRegion || 'region not selected'}` : 'No current injury recorded'}</p><p>{redFlags ? '⚠ Medical review required' : '✓ No red flags recorded'}</p></section></div>;
}

function RangeInput({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) { return <label>{label} 0–10<input type="range" min="0" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} /><b>{value}/10</b></label>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

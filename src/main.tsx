import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Section = 'home' | 'medical' | 'training' | 'nutrition' | 'progress' | 'education' | 'team';

type Intake = {
  injured: boolean | null;
  redFlag: boolean;
  age: string;
  medicalHistory: string;
  medications: string;
  priorInjuries: string;
  goals: string;
  frequency: string;
  style: string;
  restrictions: string;
};

const sections: Array<{ id: Section; label: string; subtitle: string }> = [
  { id: 'home', label: 'Dashboard', subtitle: 'Your care and performance hub' },
  { id: 'medical', label: 'Medical', subtitle: 'Assessment, safety and injury review' },
  { id: 'training', label: 'Training', subtitle: 'Coach-assigned plan, RPE / RIR and e1RM' },
  { id: 'nutrition', label: 'Nutrition', subtitle: 'Plan, adherence and dietitian follow-up' },
  { id: 'progress', label: 'Progress', subtitle: 'Weight, pain, ROM and performance trends' },
  { id: 'education', label: 'Anatomy & Learn', subtitle: 'Body map, anatomy and injury education' },
  { id: 'team', label: 'Team', subtitle: 'Medical, training and nutrition professionals' },
];

const initialIntake: Intake = {
  injured: null,
  redFlag: false,
  age: '',
  medicalHistory: '',
  medications: '',
  priorInjuries: '',
  goals: '',
  frequency: '',
  style: '',
  restrictions: '',
};

function App() {
  const [section, setSection] = useState<Section>('home');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<Intake>(initialIntake);

  const active = useMemo(() => sections.find((item) => item.id === section)!, [section]);

  const next = () => setStep((value) => Math.min(value + 1, 3));
  const back = () => setStep((value) => Math.max(value - 1, 0));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DC</div>
          <div>
            <strong>DoctorCoach</strong>
            <span>Medicine × Training × Nutrition</span>
          </div>
        </div>
        <nav>
          {sections.map((item) => (
            <button key={item.id} className={section === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setSection(item.id)}>
              <span>{item.label}</span>
              <small>{item.subtitle}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" /> Team-connected care
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">DOCTORCOACH</p>
            <h1>{active.label}</h1>
            <p>{active.subtitle}</p>
          </div>
          <button className="outline-button" onClick={() => { setShowOnboarding(true); setStep(0); }}>Run onboarding</button>
        </header>

        {section === 'home' && <Dashboard />}
        {section === 'medical' && <Medical />}
        {section === 'training' && <Training />}
        {section === 'nutrition' && <Nutrition />}
        {section === 'progress' && <Progress />}
        {section === 'education' && <Education />}
        {section === 'team' && <Team />}
      </main>

      {showOnboarding && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="step-line"><span style={{ width: `${(step + 1) * 25}%` }} /></div>
            {step === 0 && (
              <div>
                <p className="eyebrow">WELCOME</p>
                <h2>One profile. One coordinated plan.</h2>
                <p>DoctorCoach connects medical assessment, injury-aware training, nutrition and progress tracking without asking you to rebuild your story in every section.</p>
                <div className="feature-grid compact">
                  <Mini title="Medical" text="Safety screening and injury review" />
                  <Mini title="Training" text="Coach-assigned programming" />
                  <Mini title="Nutrition" text="Dietitian-led planning" />
                  <Mini title="Progress" text="Pain, ROM, body weight and e1RM" />
                </div>
              </div>
            )}
            {step === 1 && (
              <div>
                <p className="eyebrow">SAFETY FIRST</p>
                <h2>Do you currently have an injury?</h2>
                <div className="choice-row">
                  <button className={intake.injured === true ? 'choice selected' : 'choice'} onClick={() => setIntake({ ...intake, injured: true })}>Yes</button>
                  <button className={intake.injured === false ? 'choice selected' : 'choice'} onClick={() => setIntake({ ...intake, injured: false })}>No</button>
                </div>
                <label className="check-card">
                  <input type="checkbox" checked={intake.redFlag} onChange={(e) => setIntake({ ...intake, redFlag: e.target.checked })} />
                  <span><strong>I have a concerning symptom or red flag</strong><br /><small>Examples: major trauma, rapidly worsening weakness, loss of bowel/bladder control, chest pain, fainting, unexplained severe symptoms.</small></span>
                </label>
                {intake.redFlag && <div className="alert">This path should route to Medical Review rather than automated diagnosis.</div>}
              </div>
            )}
            {step === 2 && (
              <div>
                <p className="eyebrow">YOUR PROFILE</p>
                <h2>Build the shared intake</h2>
                <div className="form-grid">
                  <input placeholder="Age" value={intake.age} onChange={(e) => setIntake({ ...intake, age: e.target.value })} />
                  <input placeholder="Training frequency" value={intake.frequency} onChange={(e) => setIntake({ ...intake, frequency: e.target.value })} />
                  <input placeholder="Training style / discipline" value={intake.style} onChange={(e) => setIntake({ ...intake, style: e.target.value })} />
                  <input placeholder="Primary goals" value={intake.goals} onChange={(e) => setIntake({ ...intake, goals: e.target.value })} />
                  <textarea placeholder="Relevant medical history" value={intake.medicalHistory} onChange={(e) => setIntake({ ...intake, medicalHistory: e.target.value })} />
                  <textarea placeholder="Current medications" value={intake.medications} onChange={(e) => setIntake({ ...intake, medications: e.target.value })} />
                  <textarea placeholder="Prior injuries / surgeries" value={intake.priorInjuries} onChange={(e) => setIntake({ ...intake, priorInjuries: e.target.value })} />
                  <textarea placeholder="Restrictions from physician / physiotherapist" value={intake.restrictions} onChange={(e) => setIntake({ ...intake, restrictions: e.target.value })} />
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <p className="eyebrow">QUICK TOUR</p>
                <h2>You are ready to enter DoctorCoach</h2>
                <div className="timeline">
                  <div><b>1</b><span>Open the body map or medical section to locate the problem.</span></div>
                  <div><b>2</b><span>Review the assigned rehab and training plan.</span></div>
                  <div><b>3</b><span>Log pain, ROM, RPE/RIR, reps and load during the session.</span></div>
                  <div><b>4</b><span>Follow progress and contact your care team when needed.</span></div>
                </div>
                {intake.redFlag && <div className="alert">On completion, your first destination will be Medical Review.</div>}
              </div>
            )}
            <div className="modal-actions">
              <button className="ghost-button" onClick={step === 0 ? () => setShowOnboarding(false) : back}>{step === 0 ? 'Skip for now' : 'Back'}</button>
              {step < 3 ? (
                <button className="primary-button" onClick={next}>Continue</button>
              ) : (
                <button className="primary-button" onClick={() => { setShowOnboarding(false); setSection(intake.redFlag ? 'medical' : 'home'); }}>Enter DoctorCoach</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  return <div className="content-grid">
    <section className="hero-card">
      <p className="eyebrow">TODAY</p>
      <h2>Your plan adapts to your injury, performance and recovery.</h2>
      <p>Medical, training and nutrition data are designed to live under one shared athlete profile.</p>
      <div className="hero-actions"><button className="primary-button">Start readiness check</button><button className="outline-button">View today’s workout</button></div>
    </section>
    <section className="card"><h3>Readiness</h3><div className="metrics"><Metric value="7.5" label="Sleep" /><Metric value="3/10" label="Pain" /><Metric value="6/10" label="Fatigue" /></div></section>
    <section className="card"><h3>Rehab journey</h3><p>Phase 2 · Capacity rebuilding</p><div className="progress-bar"><span style={{width:'58%'}} /></div><small>Next milestone: pain ≤ 2/10 during loaded pattern</small></section>
    <section className="card"><h3>Team overview</h3><ul><li>Medical: Tamir Eilam</li><li>Training: Nadav Ron</li><li>Nutrition: Lior Zelikson</li></ul></section>
  </div>;
}

function Medical() { return <Module title="Medical & Injury Assessment" text="Structured injury intake, red-flag screening, medical review and shared restrictions for the rest of the team." items={['Injury questionnaire', 'Red-flag routing', 'Medical notes', 'Restrictions shared with coach and dietitian']} />; }
function Training() { return <Module title="Coach-led Training" text="Trainees enter only the program assigned by the coach. Self-programming can later be offered as a paid standalone subscription." items={['RPE or RIR mode', 'e1RM after each set', 'Within-session load suggestions', 'Coach-approved exercise substitutions', 'Video upload for set review']} />; }
function Nutrition() { return <Module title="Nutrition" text="Dietitian-led nutrition planning linked to body-weight and training data." items={['Nutrition assessment', 'Calories/macros or flexible principles', 'Training-day vs rest-day plan', 'Daily adherence check-in', 'Weekly dietitian check-in']} />; }
function Progress() { return <Module title="Progress" text="One dashboard for rehabilitation and performance trends." items={['Body weight', 'Working load and e1RM', 'Pain before/during/after/next day', 'ROM tracking', 'Readiness trends']} />; }
function Education() { return <Module title="Anatomy & Learning" text="The future body map will let the user select a region and muscle, then open anatomy, common injury patterns and rehab guidance." items={['Interactive body map', 'Region pages', 'Muscle pages', 'Injury education', 'Contextual feedback button']} />; }
function Team() { return <Module title="Meet the Team" text="A coordinated care model with discipline-specific notes and a shared team dashboard." items={['Tamir Eilam · Medical', 'Nadav Ron · Training', 'Lior Zelikson · Nutrition', 'Internal notes and mentions', 'Appointments and support']} />; }

function Module({ title, text, items }: { title: string; text: string; items: string[] }) {
  return <section className="module-card"><p className="eyebrow">MODULE</p><h2>{title}</h2><p>{text}</p><div className="feature-grid">{items.map((item) => <Mini key={item} title={item} text="Planned in the DoctorCoach roadmap" />)}</div></section>;
}

function Mini({ title, text }: { title: string; text: string }) { return <div className="mini-card"><strong>{title}</strong><span>{text}</span></div>; }
function Metric({ value, label }: { value: string; label: string }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

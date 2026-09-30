import React from 'react';
import { AthleteProfile, Section } from './domain';
import { AuthUser } from './platform/auth';
import './home-dashboard.css';

type HomeDashboardProps = {
  redFlags: boolean;
  profile: AthleteProfile;
  user: AuthUser;
  onGo: (section: Section) => void;
};

type TodayAction = {
  title: string;
  detail: string;
  owner: string;
  section: Section;
  cta: string;
  priority: 'urgent' | 'primary' | 'normal';
};

const careTeam = [
  {
    name: 'Dr. Tamir Eilam',
    role: 'Medical assessment',
    detail: 'Injury assessment, safety review, medical clearance and return-to-training direction.',
    section: 'medical' as Section,
  },
  {
    name: 'Nadav Ron',
    role: 'Training & coaching',
    detail: 'Mr. Israel 2024 · Certified fitness coach · Builds and adjusts the training plan.',
    section: 'training' as Section,
  },
  {
    name: 'Lior Zelikson',
    role: 'Clinical nutrition',
    detail: 'Clinical dietitian · Nutrition assessment, plan, adherence and ongoing follow-up.',
    section: 'nutrition' as Section,
  },
];

function buildTodayActions(profile: AthleteProfile, redFlags: boolean): TodayAction[] {
  if (redFlags) {
    return [
      {
        title: 'Medical review is required',
        detail: 'Your intake contains a safety flag. Injury-specific guidance should wait for medical review.',
        owner: 'Dr. Tamir Eilam',
        section: 'medical',
        cta: 'Open medical review',
        priority: 'urgent',
      },
      {
        title: 'Keep the team profile updated',
        detail: 'Your medical, training and nutrition team use one shared profile and restrictions list.',
        owner: 'DoctorCoach team',
        section: 'team',
        cta: 'Open team dashboard',
        priority: 'normal',
      },
    ];
  }

  if (profile.intake.injured) {
    return [
      {
        title: 'Continue your rehabilitation plan',
        detail: 'Log pain, range of motion and milestones so the plan reflects how you are progressing.',
        owner: 'Rehabilitation pathway',
        section: 'rehabilitation',
        cta: 'Open rehabilitation',
        priority: 'primary',
      },
      {
        title: 'Complete the coach-assigned workout',
        detail: 'Log load, reps and RPE/RIR. Your coach can use the session data to adjust the plan.',
        owner: 'Nadav Ron',
        section: 'training',
        cta: 'Open today’s workout',
        priority: 'normal',
      },
      {
        title: 'Check your progress trend',
        detail: 'Review pain, ROM, readiness, body weight and training performance in one place.',
        owner: 'DoctorCoach team',
        section: 'progress',
        cta: 'View progress',
        priority: 'normal',
      },
    ];
  }

  return [
    {
      title: 'Open today’s training',
      detail: 'Follow your assigned plan and log performance using RPE or RIR.',
      owner: 'Nadav Ron',
      section: 'training',
      cta: 'Start workout',
      priority: 'primary',
    },
    {
      title: 'Complete a readiness check',
      detail: 'Sleep, fatigue and pain help the team interpret the session in context.',
      owner: 'DoctorCoach team',
      section: 'training',
      cta: 'Open readiness',
      priority: 'normal',
    },
    {
      title: 'Review your trend',
      detail: 'Track e1RM, body weight, readiness and other progress signals over time.',
      owner: 'DoctorCoach team',
      section: 'progress',
      cta: 'View progress',
      priority: 'normal',
    },
  ];
}

export default function HomeDashboard({ redFlags, profile, user, onGo }: HomeDashboardProps) {
  const actions = buildTodayActions(profile, redFlags);
  const primary = actions[0];

  return (
    <div className="home-dashboard">
      <section className="today-hero">
        <div>
          <p className="eyebrow">WHAT DO I NEED TO DO TODAY?</p>
          <h2>{primary.title}</h2>
          <p>{primary.detail}</p>
          <div className="today-actions">
            <button className="primary-button" onClick={() => onGo(primary.section)}>{primary.cta}</button>
            <button className="outline-button" onClick={() => onGo('progress')}>See my progress</button>
          </div>
        </div>
        <div className={`today-status ${redFlags ? 'danger' : 'safe'}`}>
          <span>{redFlags ? 'Medical review' : 'Care status'}</span>
          <strong>{redFlags ? 'Action required' : 'Plan active'}</strong>
          <small>{profile.intake.injured ? `Current focus: ${profile.intake.injuryRegion || 'injury recovery'}` : 'No current injury recorded'}</small>
        </div>
      </section>

      <section className="today-section">
        <div className="section-heading">
          <div><p className="eyebrow">TODAY</p><h3>Your next actions</h3></div>
          <small>Clear actions instead of a wall of modules.</small>
        </div>
        <div className="action-stack">
          {actions.map((action, index) => (
            <button key={`${action.section}-${index}`} className={`action-row ${action.priority}`} onClick={() => onGo(action.section)}>
              <span className="action-index">{index + 1}</span>
              <span className="action-copy"><strong>{action.title}</strong><small>{action.detail}</small></span>
              <span className="action-owner"><small>Managed by</small><b>{action.owner}</b></span>
              <span className="action-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-two-column">
        <div className="today-section">
          <div className="section-heading"><div><p className="eyebrow">YOUR TEAM</p><h3>Who is responsible for what</h3></div></div>
          <div className="care-team-grid">
            {careTeam.map((member) => (
              <button className="care-team-card" key={member.name} onClick={() => onGo(member.section)}>
                <span className="team-avatar">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                <span><strong>{member.name}</strong><b>{member.role}</b><small>{member.detail}</small></span>
                <span className="action-arrow">→</span>
              </button>
            ))}
          </div>
        </div>

        <div className="today-section journey-card">
          <div className="section-heading"><div><p className="eyebrow">YOUR JOURNEY</p><h3>One coordinated path</h3></div></div>
          <div className="journey-steps">
            <button onClick={() => onGo('medical')}><b>1</b><span><strong>Assess</strong><small>Medical safety and direction</small></span></button>
            <button onClick={() => onGo('rehabilitation')}><b>2</b><span><strong>Recover</strong><small>Pain, ROM and milestones</small></span></button>
            <button onClick={() => onGo('training')}><b>3</b><span><strong>Train</strong><small>Coach-built plan and session data</small></span></button>
            <button onClick={() => onGo('nutrition')}><b>4</b><span><strong>Support</strong><small>Optional clinical nutrition</small></span></button>
            <button onClick={() => onGo('progress')}><b>5</b><span><strong>Progress</strong><small>See the whole story over time</small></span></button>
          </div>
        </div>
      </section>

      <section className="today-section compact-profile-strip">
        <div><small>Signed in as</small><strong>{user.displayName}</strong></div>
        <div><small>Training mode</small><strong>{profile.trainingMode}</strong></div>
        <div><small>Assigned plan</small><strong>{profile.assignedPlanId || 'Awaiting assignment'}</strong></div>
        <button className="outline-button" onClick={() => onGo('team')}>Open shared team view</button>
      </section>
    </div>
  );
}

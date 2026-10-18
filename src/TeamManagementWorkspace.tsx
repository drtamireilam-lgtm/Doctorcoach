import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTeamAccess, loadMyTeamMembership, type TeamMembership, type TeamRole } from './platform/team-access';

type MemberRow = { user_id: string; email: string; role: TeamRole; status: 'active' | 'suspended' };
const invitationRoles: Array<{ value: Exclude<TeamRole, 'owner'>; label: string }> = [
  { value: 'coach', label: 'מאמן' }, { value: 'head_coach', label: 'מאמן ראשי' },
  { value: 'doctor', label: 'רופא' }, { value: 'dietitian', label: 'דיאטן' },
  { value: 'ux_qa', label: 'בדיקות וחוויית משתמש' },
  { value: 'marketing', label: 'שיווק' }, { value: 'admin', label: 'מנהל' },
];

export default function TeamManagementWorkspace({ client }: { client: SupabaseClient }) {
  const [membership, setMembership] = useState<TeamMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('coach');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [invitationId, setInvitationId] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersError, setMembersError] = useState('');
  const [coachId, setCoachId] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [athleteEmail, setAthleteEmail] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  async function findAthlete() {
    if (lookupBusy || !hasTeamAccess(membership, 'manage_team')) return;
    setLookupBusy(true);
    setAthleteId('');
    setMessage('');
    const { data, error: lookupError } = await client.rpc('dc_find_athlete_for_assignment', {
      p_email: athleteEmail.trim().toLowerCase(),
    });
    setLookupBusy(false);
    if (lookupError || !Array.isArray(data) || data.length !== 1) {
      setMessage('לא נמצא חשבון מתאמן מאומת בכתובת זו.');
      return;
    }
    setAthleteId(data[0].user_id);
    setMessage('נמצא חשבון מתאמן. ניתן לשלוח בקשת שיוך.');
  }
  async function requestAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !hasTeamAccess(membership, 'manage_team')) return;
    setPending(true); setMessage('');
    const { error: assignError } = await client.rpc('dc_request_coach_assignment', {
      p_coach_id: coachId.trim(), p_athlete_id: athleteId.trim(),
    });
    setPending(false);
    setMessage(assignError ? 'לא ניתן לשלוח בקשת שיוך. ודא שהמזהים תקינים ושהמאמן פעיל.' :
      'בקשת השיוך נוצרה. המתאמן צריך לאשר אותה בחשבונו לפני הפעלת הקשר.');
    if (!assignError) { setAthleteId(''); setAthleteEmail(''); }
  }
  async function refreshMembers() {
    const { data, error: fetchError } = await client.rpc('dc_list_team_members');
    if (fetchError) { setMembersError('לא ניתן לטעון את רשימת הצוות.'); return; }
    setMembersError('');
    setMembers((data ?? []) as MemberRow[]);
  }
  async function changeMember(userId: string, newRole: TeamRole, newStatus: 'active' | 'suspended') {
    if (!hasTeamAccess(membership, 'manage_team') || pending || userId === membership?.user_id) return;
    if (!window.confirm('לאשר שינוי הרשאות לאיש הצוות?')) return;
    setPending(true); setMessage('');
    const { error: updateError } = await client.rpc('dc_manage_team_member', {
      p_user_id: userId, p_role: newRole, p_status: newStatus,
    });
    setPending(false);
    setMessage(updateError ? 'שינוי ההרשאה נכשל.' : 'ההרשאה עודכנה.');
    if (!updateError) await refreshMembers();
  }
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMyTeamMembership(client).then(value => {
      if (!cancelled) { setMembership(value); setLoading(false); if (hasTeamAccess(value, 'manage_team')) void refreshMembers(); }
    }).catch(err => {
      if (!cancelled) { setError(err instanceof Error ? err.message : 'לא ניתן לטעון הרשאות.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [client]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !hasTeamAccess(membership, 'manage_team')) return;
    setPending(true); setMessage(''); setInvitationId('');
    try {
      const { data, error: rpcError } = await client.rpc('dc_create_team_invitation', {
        p_email: email.trim().toLowerCase(), p_role: role,
      });
      if (rpcError) throw rpcError;
      setInvitationId(String(data));
      setMessage('ההזמנה נוצרה במסד הנתונים. עדיין לא נשלח אימייל. יש לבקש מהמשתמש להתחבר עם אותה כתובת אימייל מאומתת, ולאחר מכן להפעיל קבלת הזמנה.');
      setEmail('');
    } catch {
      setMessage('לא ניתן ליצור הזמנה. בדוק הרשאות, תקינות כתובת האימייל וחיבור LAB.');
    } finally { setPending(false); }
  }

  return <main className="main-panel" dir="rtl">
    <section className="hero-card">
      <p className="eyebrow">DOCTORCOACH · LAB</p>
      <h1>ניהול צוות ומאמנים</h1>
      {loading ? <p role="status">טוען הרשאות…</p> :
        error ? <p role="alert" className="alert">{error}</p> :
        !hasTeamAccess(membership, 'manage_team') ?
          <p role="alert" className="alert">אין לך הרשאה לנהל את הצוות.</p> :
          <>
            <p>שלום, מנהל המערכת. החשבון שלך מזוהה כבעל הרשאת ניהול צוות.</p>
            <form onSubmit={createInvitation}>
              <h2>הזמנת איש צוות</h2>
              <label htmlFor="team-invite-email">כתובת אימייל</label>
              <input id="team-invite-email" type="email" autoComplete="email" required maxLength={254}
                value={email} onChange={e => setEmail(e.target.value)} />
              <label htmlFor="team-invite-role">תפקיד</label>
              <select id="team-invite-role" value={role} onChange={e => setRole(e.target.value as Exclude<TeamRole, 'owner'>)}>
                {invitationRoles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button className="primary-button" type="submit" disabled={pending}>
                {pending ? 'יוצר הזמנה…' : 'יצירת הזמנה'}
              </button>
            </form>
            {message && <p role="status">{message}</p>}
            {invitationId && <small>מזהה הזמנה: {invitationId}</small>}
            <h2>חברי הצוות</h2>
            <button className="outline-button" type="button" onClick={() => void refreshMembers()}>רענון רשימה</button>
            {membersError && <p role="alert">{membersError}</p>}
            <div className="timeline">
              {members.map(member => <div key={member.user_id}>
                <span><strong>{member.email}</strong> · {member.role} · {member.status}</span>
                {member.role !== 'owner' && <span>
                  <select aria-label={`תפקיד עבור ${member.email}`} value={member.role}
                    disabled={pending} onChange={e => void changeMember(member.user_id, e.target.value as TeamRole, member.status)}>
                    {invitationRoles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <button className="outline-button" disabled={pending}
                    onClick={() => void changeMember(member.user_id, member.role, member.status === 'active' ? 'suspended' : 'active')}>
                    {member.status === 'active' ? 'השעיה' : 'הפעלה'}
                  </button>
                </span>}
              </div>)}
            </div>
            <h2>שיוך מתאמן למאמן</h2>
            <p>חיפוש מתאמן באמצעות כתובת אימייל מלאה. נדרש אישור המתאמן לשיוך.</p>
            <label htmlFor="athlete-email">אימייל המתאמן</label>
            <input id="athlete-email" type="email" value={athleteEmail} onChange={e => {
              setAthleteEmail(e.target.value); setAthleteId('');
            }} />
            <button type="button" className="outline-button" disabled={lookupBusy || !athleteEmail}
              onClick={() => void findAthlete()}>{lookupBusy ? 'מחפש…' : 'חיפוש מתאמן'}</button>
            <form onSubmit={requestAssignment}>
              <label htmlFor="assign-coach">בחירת מאמן פעיל</label>
              <select id="assign-coach" required value={coachId} onChange={e => setCoachId(e.target.value)}>
                <option value="">בחר מאמן</option>
                {members.filter(member => member.status === 'active' &&
                  (member.role === 'coach' || member.role === 'head_coach'))
                  .map(member => <option key={member.user_id} value={member.user_id}>{member.email}</option>)}
              </select>
              {athleteId && <p role="status">המתאמן זוהה בהצלחה.</p>}
              <button className="primary-button" type="submit" disabled={pending || !coachId || !athleteId}>
                {pending ? 'שולח בקשה…' : 'שליחת בקשת שיוך'}
              </button>
            </form>
            <p>הגישה לנתוני המתאמן תוגדר בנפרד ותדרוש בדיקות הרשאה.</p>
          </>}
    </section>
  </main>;
}

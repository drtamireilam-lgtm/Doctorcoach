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
            <p>השלב הבא: שליחת אימייל, קבלת הזמנה בממשק ושיוך מתאמנים.</p>
          </>}
    </section>
  </main>;
}

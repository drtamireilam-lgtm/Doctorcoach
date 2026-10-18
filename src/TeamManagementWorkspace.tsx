import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasTeamAccess, loadMyTeamMembership, type TeamMembership } from './platform/team-access';

/**
 * Read-only LAB preview. Mutating team roles must be implemented with
 * authenticated server-side endpoints and audited before enabling controls.
 */
export default function TeamManagementWorkspace({ client }: { client: SupabaseClient }) {
  const [membership, setMembership] = useState<TeamMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMyTeamMembership(client).then(value => {
      if (!cancelled) { setMembership(value); setLoading(false); }
    }).catch(err => {
      if (!cancelled) { setError(err instanceof Error ? err.message : 'לא ניתן לטעון הרשאות.'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [client]);

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
            <p>ניהול ההזמנות, שינוי תפקידים, השעיית משתמשים ושיוך מתאמנים יופעלו רק לאחר חיבור פעולות שרת מאובטחות ובדיקת הרשאות.</p>
            <div className="timeline">
              <div><b>1</b><span>הרשאות המשתמש הנוכחי: {membership?.role}</span></div>
              <div><b>2</b><span>הוספת חברי צוות: ממתין לחיבור שרת</span></div>
              <div><b>3</b><span>שיוך מתאמנים למאמנים: ממתין לבדיקות אבטחה</span></div>
            </div>
          </>}
    </section>
  </main>;
}

import type { ChangeEvent } from 'react';

type Plan = { id: string; title: string; athlete_id: string; coach_id: string | null };

export function filterCoachPlans(plans: Plan[], coachId: string, search: string, athleteId: string): Plan[] {
  const needle = search.trim().toLocaleLowerCase();
  return plans.filter(plan => plan.coach_id === coachId &&
    (athleteId === 'all' || plan.athlete_id === athleteId) &&
    plan.title.toLocaleLowerCase().includes(needle));
}

export default function CoachPlanFilters({ plans, coachId, search, athleteId, onSearch, onAthlete }: {
  plans: Plan[]; coachId: string; search: string; athleteId: string;
  onSearch: (value: string) => void; onAthlete: (value: string) => void;
}) {
  const owned = plans.filter(plan => plan.coach_id === coachId);
  const athletes = [...new Set(owned.map(plan => plan.athlete_id))];
  if (!owned.length) return null;
  return <section aria-label="סינון תוכניות המאמן">
    <h3>תוכניות המתאמנים שלי</h3>
    <p>{athletes.length} מתאמנים עם תוכניות · {owned.length} תוכניות</p>
    <label>חיפוש תוכנית <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => onSearch(event.target.value)} /></label>
    <label>בחירת מתאמן <select value={athleteId} onChange={(event: ChangeEvent<HTMLSelectElement>) => onAthlete(event.target.value)}>
      <option value="all">כל המתאמנים</option>
      {athletes.map(id => <option key={id} value={id}>מתאמן {id.slice(0, 8)}…</option>)}
    </select></label>
    <p>מוצגים מזהים מקוצרים עד לחיבור שמות מתאמנים מאומתים.</p>
  </section>;
}

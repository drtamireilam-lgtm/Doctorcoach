// Literal bilingual paraphrases of existing catalog names/descriptions, not
// The first group uses catalog terminology; the observed group uses exercise
// names only from authorized workbooks. No heldout-derived tuning.
// No equipment, angle, side or posture is inferred beyond the source entry.
export const reviewedImportAliases=[
 {exerciseId:'barbell-bench',names:['לחיצת חזה במוט על ספסל שטוח']},
 {exerciseId:'bench',names:['לחיצת חזה בדאמבלים על ספסל שטוח']},
 {exerciseId:'barbell-curl',names:['כפיפות מרפקים עם מוט']},
 {exerciseId:'cable-overhead-triceps',names:['פשיטת מרפקים בכבל מעל הראש']},
 {exerciseId:'lying-curl',names:['כפיפת ברכיים במכונה בשכיבה']},
 {exerciseId:'seated-curl',names:['כפיפת ברכיים במכונה בישיבה']},
 // Observed spelling / word order, checked against the existing canonical entries.
 {exerciseId:'bench',names:['dumbbell flat press']},
 {exerciseId:'adduction',names:['Hip addaction machine']},
 {exerciseId:'lying-curl',names:['leg curls בשכיבה']},
] as const;
export const importAliasReviewSource='Canonical names/descriptions in lib/content.ts and lib/gym-exercises.ts; three observed exercise names from authorized workbooks; literal equivalence review, 2026-10-25';

// Literal bilingual paraphrases of existing catalog names/descriptions, not
// The first group uses catalog terminology; the observed group uses exercise
// names only from authorized workbooks. No heldout-derived tuning.
// No equipment, angle, side or posture is inferred beyond the source entry.
export const reviewedImportAliases=[
 // Literal names from the authorized October 27 workbook; ambiguous entries stay unassigned.
 {exerciseId:'bench',names:['לחיצת חזה כנגד משקולות יד בשכיבה']},
 {exerciseId:'incline-machine-chest-press',names:['לחיצת חזה עליון כנגד מכונה ייעודית']},
 {exerciseId:'machine-chest-press',names:['לחיצת חזה כנגד מכונה ייעודית']},
 {exerciseId:'incline-db-curl',names:['כפיפות מרפקים בישיבה כנגד משקולות יד ב45 מעלות']},
 {exerciseId:'hammer-curl',names:['פטישים בעמידה']},
 {exerciseId:'wide-grip-cable-pulldown',names:['משיכה באמצעות פולי עליון באחיזה רחבה במנח יד פרונציה']},
 {exerciseId:'triceps-pushdown',names:['פשיטת מרפקים כנגד פולי עליון בעמידה']},
 {exerciseId:'back-squat',names:['סקוואט חופשי כנגד מוט']},
 {exerciseId:'seated-curl',names:['כפיפת רגליים בישיבה כנגד מכונה ייעודית']},
 {exerciseId:'lying-curl',names:['כפיפת רגליים בשכיבה כנגד מכונה ייעודית']},
 {exerciseId:'hip-abduction-machine',names:['הרחקת ירך כנגד מכונה ייעודית']},
 {exerciseId:'adduction',names:['קירוב ירך כנגד מכונה ייעודית']},
 {exerciseId:'overhead-press',names:['לחיצת כתפיים כנגד מוט באחיזה ברוחב הכתפיים']},
 {exerciseId:'seated-db-shoulder-press',names:['לחיצת כתפיים כנגד משקולות יד בישיבה']},
 {exerciseId:'lateral-raise',names:['הרחקת כתפיים בעמידה כנגד משקולות יד']},
 {exerciseId:'machine-lateral-raise',names:['הרחקת כתפיים כנגד מכונה ייעודית']},
 {exerciseId:'reverse-pec-deck',names:['הרחקת כתף אופקית כנגד מכונה ייעודית']},

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
 {exerciseId:'overhead-triceps',names:['triceps behind the head']},
 // Additional literal names observed in five authorized workbooks, 2026-10-26.
 // Source files and personal metadata are excluded; these are catalog-equivalent.
 {exerciseId:'hip-thrust',names:['hip thurst']},
 {exerciseId:'cable-abduction',names:['הרחקת רגליים בעמידה נגד פולי']},
 {exerciseId:'reverse-pec-deck',names:['כתף אחורית- הרחקה אופקית בישיבה במכונה']},
 {exerciseId:'chest-fly',names:['קירוב אופקי בישיבה במכונה']},
 {exerciseId:'leg-extension',names:['פשיטת רגליים']},
 {exerciseId:'cable-er',names:['סיבוב כתף חיצוני כנגד פולי באחיזה נייטרלית']},
] as const;
export const importAliasReviewSource='Canonical names/descriptions in lib/content.ts and lib/gym-exercises.ts; observed exercise names from authorized workbooks; literal equivalence review, 2026-10-25 and 2026-10-26';

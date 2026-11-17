import {motionProfile, type MuscleRole} from './anatomy-exercise-motion.ts';

type Localized = Readonly<{en: string; he: string}>;
// Reserved for independently approved phase roles. The neutral reference uses whole-repetition roles.
type Phase = Readonly<{start: number; label: Localized; reviewedRoles?: Readonly<Record<string, MuscleRole>>}>;
type AnimationEntry = Readonly<{
  exerciseId: string;
  animationId: string;
  title: Localized;
  variantLabel: Localized;
  notes: Localized;
  review: 'pending' | 'approved';
  visibility: 'lab' | 'public' | 'hidden';
  equipment: readonly string[];
  phases: readonly Phase[];
  provenance: string;
}> & (
  | {technicalStatus: 'prototype' | 'ready'; movement: 'rigid-elbow-v1'; startPose: 'source-neutral'; camera: 'front'; controls: readonly string[]; secondsPerRep: number; modelId: string; assetSha256: string; roles: Readonly<Record<string, MuscleRole>>}
  | {technicalStatus: 'blocked'; movement: null; existingClip?: 'bench'}
);

const curl = motionProfile('barbell-curl')!;
const entries: readonly AnimationEntry[] = [
  {
    exerciseId: curl.exerciseId,
    animationId: 'barbell-curl-source-elbow-v1',
    title: {en: 'Biceps Curl', he: 'כפיפת מרפקים'},
    variantLabel: {en: 'Standing bilateral curl · elbow motion study', he: 'כפיפה דו־צדדית בעמידה · הדגמת תנועת המרפק'},
    notes: {
      en: 'Experimental rigid bone motion. Joint calibration and review are pending. The source forearm orientation is fixed and bar grip is unmodeled. Muscle roles appear on the neutral anatomy reference.',
      he: 'תנועת עצמות ניסיונית. כיול המפרקים והסקירה ממתינים. האמה שומרת על מנח המקור ואחיזת המוט טרם מודלה. תפקידי השרירים מוצגים במנח הייחוס האנטומי.',
    },
    technicalStatus: 'prototype',
    movement: 'rigid-elbow-v1',
    startPose: 'source-neutral',
    camera: 'front',
    controls: ['play', 'pause', 'restart', 'speed', 'seek', 'camera', 'muscle-reference'],
    secondsPerRep: curl.secondsPerRep,
    modelId: curl.modelId,
    assetSha256: curl.assetSha256,
    roles: curl.roles,
    equipment: [],
    phases: [
      {start: 0, label: {en: 'Begin lift', he: 'תחילת ההרמה'}},
      {start: .25, label: {en: 'Lifting', he: 'הרמה'}},
      {start: .5, label: {en: 'Begin return', he: 'תחילת החזרה'}},
      {start: .75, label: {en: 'Lowering', he: 'הורדה'}},
    ],
    review: 'pending',
    visibility: 'lab',
    provenance: 'BodyParts3D, DBCLS, CC BY 4.0; DoctorCoach source-space elbow adapter',
  },
  {
    exerciseId: 'barbell-bench',
    animationId: 'flat-barbell-bench-v1',
    title: {en: 'Bench Press', he: 'לחיצת חזה'},
    variantLabel: {en: 'Flat barbell bench press', he: 'לחיצת חזה במוט על ספסל שטוח'},
    notes: {
      en: 'Interactive motion awaits shoulder and scapular calibration, bench support and bilateral bar-grip constraints.',
      he: 'תנועה אינטראקטיבית ממתינה לכיול הכתף והשכמה, לתמיכת הספסל ולאילוצי אחיזה דו־צדדית במוט.',
    },
    technicalStatus: 'blocked',
    movement: null,
    existingClip: 'bench',
    equipment: ['flat-bench', 'barbell'],
    phases: [],
    review: 'pending',
    visibility: 'hidden',
    provenance: 'Existing DoctorCoach LAB atlas preview, BodyParts3D, DBCLS, CC BY 4.0',
  },
  {
    exerciseId: 'back-squat',
    animationId: 'barbell-back-squat-v1',
    title: {en: 'Squat', he: 'סקוואט'},
    variantLabel: {en: 'High-bar back squat', he: 'סקוואט עם מוט גבוה על הגב'},
    notes: {
      en: 'Interactive motion awaits linked hip, knee and ankle calibration, stable foot contact and bar support.',
      he: 'תנועה אינטראקטיבית ממתינה לכיול משולב של הירך, הברך והקרסול, למגע יציב עם הקרקע ולתמיכה במוט.',
    },
    technicalStatus: 'blocked',
    movement: null,
    equipment: ['barbell'],
    phases: [],
    review: 'pending',
    visibility: 'hidden',
    provenance: 'DoctorCoach pilot specification',
  },
];

const byExerciseId = new Map<string, AnimationEntry>();
const animationIds = new Set<string>();
for (const entry of entries) {
  if (byExerciseId.has(entry.exerciseId) || animationIds.has(entry.animationId)) {
    throw new Error('Duplicate exercise animation identity: ' + entry.animationId);
  }
  if (entry.technicalStatus !== 'blocked') {
    const profile = motionProfile(entry.exerciseId);
    if (!profile || profile.modelId !== entry.modelId || profile.assetSha256 !== entry.assetSha256 ||
        !Number.isFinite(entry.secondsPerRep) || entry.secondsPerRep <= 0 || entry.secondsPerRep !== profile.secondsPerRep ||
        entry.phases[0]?.start !== 0 || entry.phases.some(({start}, i) =>
          !Number.isFinite(start) || start >= 1 || (i > 0 && start <= entry.phases[i - 1].start))) {
      throw new Error('Invalid movement metadata: ' + entry.animationId);
    }
  }
  byExerciseId.set(entry.exerciseId, entry);
  animationIds.add(entry.animationId);
}

export function exerciseAnimation(catalogId: string | null | undefined): AnimationEntry | undefined {
  return catalogId ? byExerciseId.get(catalogId) : undefined;
}

export function interactiveExerciseAnimation(catalogId: string | null | undefined, labEnabled: boolean) {
  const entry = exerciseAnimation(catalogId);
  if (!entry || entry.technicalStatus === 'blocked') return undefined;
  if (entry.visibility === 'lab' && labEnabled) return entry;
  if (entry.visibility === 'public' && entry.technicalStatus === 'ready' && entry.review === 'approved') return entry;
  return undefined;
}

/** The inherited LAB clips have their own eligibility, independent of the 3D player. */
export function pressClipFor(catalogId: string): 'bench' | 'overhead' | undefined {
  if (catalogId === 'overhead-press') return 'overhead';
  const entry = exerciseAnimation(catalogId);
  if (entry?.technicalStatus === 'blocked') return entry.existingClip;
}

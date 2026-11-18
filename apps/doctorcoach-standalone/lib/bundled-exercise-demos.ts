import type {VideoAsset} from './media-store.ts';

const backCredit = 'DoctorCoach · BodyParts3D © DBCLS (CC BY 4.0) · Écorché / Z-Anatomy (Gauthier Kervyn) · Adapted animation: CC BY-SA 4.0';

const legCredit = 'DoctorCoach · BodyParts3D © DBCLS (CC BY 4.0) · Adapted animation: CC BY-SA 4.0';

const clips = [
  ['barbell-curl', 788428],
  ['barbell-bench', 929335],
  ['bench', 845610],
  ['smith-flat-bench', 769655],
  ['incline-db', 659135],
  ['incline-barbell-bench', 743748],
  ['smith-incline-bench', 668481],
  ['machine-chest-press', 800623],
  ['chest-fly', 780826],
  ['cable-fly', 749807],
  ['db-fly', 743227],
  ['push-up', 1407402],
  ['incline-machine-chest-press', 740616],
  ['parallel-bar-dip', 1167528],
  ['chest-row', 480647, backCredit],
  ['cable-row', 522566, backCredit],
  ['single-arm-db-row', 354030, backCredit],
  ['straight-arm-pulldown', 460804, backCredit],
  ['wide-row', 464311, backCredit],
  ['assisted-pull-up', 909419, backCredit],
  ['pullup', 775370, backCredit],
  ['chinup', 763320, backCredit],
  ['barbell-row', 526529, backCredit],
  ['back-extension', 693100, backCredit],
  ['lat-pulldown', 642990, backCredit],
  ['back-squat', 955826, legCredit],
  ['rdl', 906115, legCredit],
  ['leg-press', 531579, legCredit],
  ['bulgarian-split-squat', 1115411, legCredit],
  ['hip-thrust', 1081230, legCredit],
  ['leg-extension', 501111, legCredit],
  ['seated-curl', 365648, legCredit],
  ['adduction', 703113, legCredit],
  ['standing-calf', 762991, legCredit],
  ['seated-calf', 704815, legCredit],
] as const;

// First-party BodyParts3D animations. Only these exact catalog variants have a clip.
export const bundledExerciseDemos: VideoAsset[] = clips.map(([exerciseId, bytes, credit]) => ({
  id: 'anatomy-demo-' + exerciseId,
  exerciseId,
  playbackPath: '/anatomy/demos/' + exerciseId + '.mp4',
  caption: credit ?? 'DoctorCoach · BodyParts3D © DBCLS · CC BY 4.0',
  sessionId: null,
  setIndex: null,
  mime: 'video/mp4',
  bytes,
  kind: 'demo',
  status: 'ready',
  published: true,
  canDelete: false,
  createdAt: '2026-11-18',
  feedback: [],
}));

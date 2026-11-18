import type {VideoAsset} from './media-store.ts';

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
] as const;

// First-party BodyParts3D animations. Only these exact catalog variants have a clip.
export const bundledExerciseDemos: VideoAsset[] = clips.map(([exerciseId, bytes]) => ({
  id: 'anatomy-demo-' + exerciseId,
  exerciseId,
  playbackPath: '/anatomy/demos/' + exerciseId + '.mp4',
  caption: 'DoctorCoach · BodyParts3D © DBCLS · CC BY 4.0',
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

import records from './muscles.json';
import { exerciseLibrary } from '../exercise-library';
export type Muscle = typeof records[number];
export const muscles: Muscle[] = records;
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';
export type ExerciseMuscleLink = { exerciseId: string; muscleId: string; role: MuscleRole; status: 'draft' };
export const exerciseMuscleLinks: ExerciseMuscleLink[] = [
  { exerciseId: 'bench', muscleId: 'pectoralis-major', role: 'primary', status: 'draft' },
  { exerciseId: 'bench', muscleId: 'triceps-brachii', role: 'secondary', status: 'draft' },
  { exerciseId: 'bench', muscleId: 'infraspinatus', role: 'stabilizer', status: 'draft' },
  { exerciseId: 'db-lateral-raise', muscleId: 'deltoid-middle', role: 'primary', status: 'draft' },
  { exerciseId: 'db-lateral-raise', muscleId: 'supraspinatus', role: 'secondary', status: 'draft' },
  { exerciseId: 'db-lateral-raise', muscleId: 'trapezius', role: 'secondary', status: 'draft' },
  { exerciseId: 'lat-pulldown', muscleId: 'latissimus-dorsi', role: 'primary', status: 'draft' },
];
export const relatedExercises = (muscleId: string) => exerciseMuscleLinks.filter(l => l.muscleId === muscleId).map(l => ({...l, exercise: exerciseLibrary.find(e => e.id === l.exerciseId)!}));
export function abductionAngle(seconds: number) { return (1 - Math.cos(seconds * Math.PI / 3)) * Math.PI / 4; }

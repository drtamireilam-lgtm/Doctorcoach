export type LibraryExercise = {
  id: string;
  name: string;
  region: string;
  pattern: string;
  equipment: string;
};

export const exerciseLibrary: LibraryExercise[] = [
  { id: 'back-squat', name: 'Back Squat', region: 'Quads', pattern: 'Knee dominant', equipment: 'Barbell' },
  { id: 'front-squat', name: 'Front Squat', region: 'Quads', pattern: 'Knee dominant', equipment: 'Barbell' },
  { id: 'hack-squat', name: 'Hack Squat', region: 'Quads', pattern: 'Knee dominant', equipment: 'Machine' },
  { id: 'leg-press', name: 'Leg Press', region: 'Quads', pattern: 'Knee dominant', equipment: 'Machine' },
  { id: 'leg-extension', name: 'Leg Extension', region: 'Quads', pattern: 'Knee extension', equipment: 'Machine' },
  { id: 'split-squat', name: 'Split Squat', region: 'Quads', pattern: 'Single-leg', equipment: 'Dumbbell' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', region: 'Quads', pattern: 'Single-leg', equipment: 'Dumbbell' },
  { id: 'walking-lunge', name: 'Walking Lunge', region: 'Quads', pattern: 'Single-leg', equipment: 'Dumbbell' },
  { id: 'rdl', name: 'Romanian Deadlift', region: 'Hamstrings / Glutes', pattern: 'Hip hinge', equipment: 'Barbell' },
  { id: 'deadlift', name: 'Deadlift', region: 'Hamstrings / Glutes', pattern: 'Hip hinge', equipment: 'Barbell' },
  { id: 'hip-thrust', name: 'Hip Thrust', region: 'Hamstrings / Glutes', pattern: 'Hip extension', equipment: 'Barbell' },
  { id: 'leg-curl-seated', name: 'Seated Leg Curl', region: 'Hamstrings / Glutes', pattern: 'Knee flexion', equipment: 'Machine' },
  { id: 'leg-curl-lying', name: 'Lying Leg Curl', region: 'Hamstrings / Glutes', pattern: 'Knee flexion', equipment: 'Machine' },
  { id: 'back-extension', name: '45° Back Extension', region: 'Hamstrings / Glutes', pattern: 'Hip extension', equipment: 'Bodyweight' },
  { id: 'calf-raise-standing', name: 'Standing Calf Raise', region: 'Calves', pattern: 'Plantar flexion', equipment: 'Machine' },
  { id: 'calf-raise-seated', name: 'Seated Calf Raise', region: 'Calves', pattern: 'Plantar flexion', equipment: 'Machine' },
  { id: 'bench', name: 'Bench Press', region: 'Chest', pattern: 'Horizontal push', equipment: 'Barbell' },
  { id: 'incline-bench', name: 'Incline Bench Press', region: 'Chest', pattern: 'Incline push', equipment: 'Barbell' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', region: 'Chest', pattern: 'Incline push', equipment: 'Dumbbell' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', region: 'Chest', pattern: 'Horizontal push', equipment: 'Dumbbell' },
  { id: 'machine-chest-press', name: 'Machine Chest Press', region: 'Chest', pattern: 'Horizontal push', equipment: 'Machine' },
  { id: 'cable-fly', name: 'Cable Fly', region: 'Chest', pattern: 'Adduction', equipment: 'Cable' },
  { id: 'push-up', name: 'Push-Up', region: 'Chest', pattern: 'Horizontal push', equipment: 'Bodyweight' },
  { id: 'pull-up', name: 'Pull-Up', region: 'Back', pattern: 'Vertical pull', equipment: 'Bodyweight' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', region: 'Back', pattern: 'Vertical pull', equipment: 'Cable' },
  { id: 'barbell-row', name: 'Barbell Row', region: 'Back', pattern: 'Horizontal pull', equipment: 'Barbell' },
  { id: 'row', name: 'Chest Supported Row', region: 'Back', pattern: 'Horizontal pull', equipment: 'Machine' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', region: 'Back', pattern: 'Horizontal pull', equipment: 'Cable' },
  { id: 'single-arm-row', name: 'Single-Arm Dumbbell Row', region: 'Back', pattern: 'Horizontal pull', equipment: 'Dumbbell' },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', region: 'Back', pattern: 'Shoulder extension', equipment: 'Cable' },
  { id: 'overhead-press', name: 'Overhead Press', region: 'Shoulders', pattern: 'Vertical push', equipment: 'Barbell' },
  { id: 'shoulder-press', name: 'Machine Shoulder Press', region: 'Shoulders', pattern: 'Vertical push', equipment: 'Machine' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', region: 'Shoulders', pattern: 'Vertical push', equipment: 'Dumbbell' },
  { id: 'lateral-raise', name: 'Cable Lateral Raise', region: 'Shoulders', pattern: 'Abduction', equipment: 'Cable' },
  { id: 'db-lateral-raise', name: 'Dumbbell Lateral Raise', region: 'Shoulders', pattern: 'Abduction', equipment: 'Dumbbell' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', region: 'Shoulders', pattern: 'Horizontal abduction', equipment: 'Machine' },
  { id: 'face-pull', name: 'Face Pull', region: 'Shoulders', pattern: 'External rotation / pull', equipment: 'Cable' },
  { id: 'curl', name: 'Cable Curl', region: 'Biceps', pattern: 'Elbow flexion', equipment: 'Cable' },
  { id: 'db-curl', name: 'Dumbbell Curl', region: 'Biceps', pattern: 'Elbow flexion', equipment: 'Dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', region: 'Biceps', pattern: 'Elbow flexion', equipment: 'Dumbbell' },
  { id: 'preacher-curl', name: 'Preacher Curl', region: 'Biceps', pattern: 'Elbow flexion', equipment: 'Machine' },
  { id: 'pushdown', name: 'Triceps Pushdown', region: 'Triceps', pattern: 'Elbow extension', equipment: 'Cable' },
  { id: 'overhead-triceps', name: 'Overhead Triceps Extension', region: 'Triceps', pattern: 'Elbow extension', equipment: 'Cable' },
  { id: 'skull-crusher', name: 'Skull Crusher', region: 'Triceps', pattern: 'Elbow extension', equipment: 'EZ bar' },
  { id: 'dip', name: 'Dip', region: 'Triceps', pattern: 'Press', equipment: 'Bodyweight' },
  { id: 'pallof', name: 'Pallof Press', region: 'Core', pattern: 'Anti-rotation', equipment: 'Cable' },
  { id: 'cable-crunch', name: 'Cable Crunch', region: 'Core', pattern: 'Trunk flexion', equipment: 'Cable' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', region: 'Core', pattern: 'Anti-extension', equipment: 'Ab wheel' },
  { id: 'plank', name: 'Plank', region: 'Core', pattern: 'Anti-extension', equipment: 'Bodyweight' },
  { id: 'side-plank', name: 'Side Plank', region: 'Core', pattern: 'Anti-lateral flexion', equipment: 'Bodyweight' },
  { id: 'farmer-carry', name: 'Farmer Carry', region: 'Core', pattern: 'Loaded carry', equipment: 'Dumbbell' },
];

export const exerciseRegions = ['All', ...Array.from(new Set(exerciseLibrary.map((exercise) => exercise.region)))];
export const exerciseEquipment = ['All', ...Array.from(new Set(exerciseLibrary.map((exercise) => exercise.equipment)))];

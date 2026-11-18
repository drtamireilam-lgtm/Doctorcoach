import {exerciseMuscles} from './anatomy-learning.ts';
import type {AnatomyExerciseRole} from './anatomy-exercises.ts';
export type MusclePart='anterior'|'lateral'|'posterior';
export type ExerciseMuscleLink={slug:string;role:AnatomyExerciseRole;part?:MusclePart};
/** Explicit editorial movement families: source content.ts primary/secondary descriptors,
 * existing anatomy-learning card links, and pressing source DOI10.3390/ijerph17197339.
 * No free-text/name inference or EMG magnitude. Clinical review remains pending. */
const profiles:Record<string,ExerciseMuscleLink[]>={};
const l=(slug:string,role:AnatomyExerciseRole,part?:MusclePart):ExerciseMuscleLink=>({slug,role,...part?{part}:{}});
const p=(...slugs:string[])=>slugs.map(slug=>l(slug,'primary'));
const s=(...slugs:string[])=>slugs.map(slug=>l(slug,'secondary'));
const z=(...slugs:string[])=>slugs.map(slug=>l(slug,'stabilizer'));
function set(ids:string[],links:ExerciseMuscleLink[]){const unique=[...new Map(links.map(link=>[link.slug+':'+(link.part??''),link])).values()];for(const id of ids)profiles[id]=unique;}
function base(id:string,part?:MusclePart):ExerciseMuscleLink[]{return exerciseMuscles(id).map(link=>link.slug==='deltoid'&&part?{...link,part}:{...link});}
const quads=['rectus-femoris','vastus-lateralis','vastus-medialis','vastus-intermedius'];
const hamstrings=['biceps-femoris-long-head','semitendinosus','semimembranosus'];
const erectors=['iliocostalis-lumborum','iliocostalis-thoracis','longissimus-thoracis','spinalis-thoracis'];
const press=[...p('pectoralis-major'),...s('triceps-brachii'),l('deltoid','secondary','anterior')];
set(['bench','smith-flat-bench','smith-incline-bench','barbell-bench','incline-db','machine-chest-press','incline-barbell-bench','movement-chest-press','incline-machine-chest-press','paused-bench'],press);
set(['push-up'],[...p('pectoralis-major','triceps-brachii'),l('deltoid','secondary','anterior'),...z('transversus-abdominis')]);
set(['close-grip-bench','parallel-bar-dip'],[...p('triceps-brachii','pectoralis-major'),l('deltoid','secondary','anterior')]);
set(['cable-fly','chest-fly','db-fly'],[...p('pectoralis-major'),l('deltoid','secondary','anterior')]);
set(['chest-row','single-arm-db-row','t-bar-row','movement-bent-over-row'],[...p('latissimus-dorsi','rhomboid-major','rhomboid-minor'),...s('biceps-brachii')]);
set(['assisted-pull-up','wide-grip-cable-pulldown','narrow-grip-cable-pulldown','movement-wide-grip-pulldown','movement-narrow-grip-pulldown','movement-hammer-pulldown-narrow'],base('lat-pulldown'));
set(['movement-hammer-row-wide','movement-kelso-shrug'],base('wide-row'));
set(['straight-arm-pulldown'],[...p('latissimus-dorsi'),...s('triceps-brachii'),...z('transversus-abdominis')]);
set(['movement-pullover'],p('latissimus-dorsi'));
set(['chinup'],p('latissimus-dorsi','biceps-brachii'));
set(['barbell-row'],[...p('latissimus-dorsi','rhomboid-major','rhomboid-minor'),...s('biceps-brachii'),...z(...erectors)]);
set(['pullup'],[...p('latissimus-dorsi'),...s('biceps-brachii')]);
set(['seated-db-shoulder-press','movement-overhead-press'],base('overhead-press'));
set(['landmine'],[l('deltoid','primary','anterior'),...s('triceps-brachii','pectoralis-major')]);
set(['lateral-raise','cable-lateral-raise','machine-lateral-raise','movement-lateral-raise','movement-upright-row'],base('lateral-raise','lateral'));
set(['rear-delt','reverse-pec-deck','movement-rear-delt-fly','movement-rear-delt-row'],base('rear-delt','posterior'));
set(['face-pull'],[l('deltoid','primary','posterior'),...s('infraspinatus','teres-minor')]);
set(['cable-er'],[...p('infraspinatus','teres-minor'),l('deltoid','secondary','posterior')]);
set(['serratus-punch'],[...p('serratus-anterior'),...s('pectoralis-major'),l('deltoid','secondary','anterior')]);
set(['cable-curl','incline-db-curl','preacher-curl','machine-biceps-curl'],[...p('biceps-brachii','brachialis'),...s('brachioradialis')]);
set(['skull-crusher','cable-overhead-triceps'],base('overhead-triceps'));
set(['bulgarian-split-squat','hack-squat','smith-squat','reverse-lunge','walking-lunge','front-squat','movement-squat'],[...p(...quads,'gluteus-maximus'),...s('adductor-magnus')]);
set(['seated-leg-press'],[...p(...quads,'gluteus-maximus'),...s('adductor-magnus')]);
set(['trap-bar-deadlift'],[...p('gluteus-maximus',...quads),...s(...hamstrings),...z(...erectors)]);
set(['sumo-deadlift'],[...p('gluteus-maximus','adductor-magnus',...quads),...s(...hamstrings),...z(...erectors)]);
set(['back-extension'],[...p(...erectors,'gluteus-maximus'),...s(...hamstrings)]);
set(['cable-abduction','side-abduction'],base('hip-abduction-machine'));
set(['movement-leg-curl'],base('seated-curl'));
set(['movement-calf-raise'],base('standing-calf'));
set(['movement-shrug'],base('shrug'));
set(['cable-crunch'],base('crunch'));
set(['pallof'],[...z('transversus-abdominis','internal-oblique','external-oblique')]);
set(['ab-wheel'],[...z('transversus-abdominis','internal-oblique','external-oblique'),...s('latissimus-dorsi')]);
set(['deadlift'],[...p('gluteus-maximus',...hamstrings),...s(...quads),...z(...erectors)]);
set(['suitcase-carry'],[...z('quadratus-lumborum','internal-oblique','external-oblique'),...base('farmer-carry')]);
set(['movement-side-crunch'],p('internal-oblique','external-oblique','quadratus-lumborum'));
set(['cable-straight-leg-hip-flexion'],p('iliacus','psoas-major'));
export const exerciseRoleProfileIds=Object.keys(profiles);
export function exerciseRoleProfile(id:string):ExerciseMuscleLink[]|undefined{return profiles[id]?.map(link=>({...link}));}

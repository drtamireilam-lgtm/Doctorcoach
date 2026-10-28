/** Curated targets of stretching, distinct from active contraction roles.
 * A target describes intended tissue emphasis, not isolated muscle action.
 * Only canonical atlas muscle slugs and catalog exercise IDs are used.
 */
export const stretchAnatomyTargets:Readonly<Record<string,readonly string[]>>={
 'stretch-upper-trapezius-standing':['upper-trapezius'],
 'stretch-levator-scapulae':['levator-scapulae'],
 'stretch-doorway-chest':['pectoralis-major'],
 'stretch-supine-y-chest':['pectoralis-minor'],
 'stretch-anterior-deltoid-wall':['deltoid'],
 'stretch-posterior-shoulder-cross-body':['deltoid'],
 'stretch-lat-pole-single-arm':['latissimus-dorsi'],
 'stretch-overhead-triceps':['triceps-brachii'],
 'stretch-biceps-wall':['biceps-brachii'],
 'stretch-wrist-flexor-straight-elbow':['flexor-carpi-radialis','flexor-carpi-ulnaris'],
 'stretch-wrist-extensor-straight-elbow':['extensor-carpi-radialis-brevis','extensor-carpi-ulnaris'],
 'stretch-ql-standing-side':['quadratus-lumborum'],
 'stretch-hip-flexor-half-kneeling':['iliacus','psoas-major'],
 'stretch-modified-thomas':['iliacus','psoas-major'],
 'stretch-quadriceps-standing':['rectus-femoris','vastus-lateralis','vastus-medialis','vastus-intermedius'],
 'stretch-rectus-femoris-half-kneeling':['rectus-femoris'],
 'stretch-couch':['rectus-femoris'],
 'stretch-hamstring-step':['biceps-femoris-long-head','semitendinosus','semimembranosus'],
 'stretch-adductor-butterfly':['adductor-longus','adductor-brevis','gracilis'],
 'stretch-adductor-lateral-lunge':['adductor-longus','adductor-magnus','gracilis'],
 'stretch-lateral-hip-cross-legged':['tensor-fasciae-latae'],
 'stretch-lateral-hip-wall':['tensor-fasciae-latae'],
 'stretch-calf-wall-straight-knee':['gastrocnemius'],
 'stretch-soleus-wall-bent-knee':['soleus'],
};
export function stretchingTargets(exerciseId:string):readonly string[]{
 return stretchAnatomyTargets[exerciseId]??[];
}
export function stretchesForMuscle(muscleSlug:string):string[]{
 return Object.entries(stretchAnatomyTargets).filter(([,slugs])=>slugs.includes(muscleSlug)).map(([id])=>id);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {matchExerciseForImport as match} from '../lib/exercise-matching.ts';

test('recognition 3 resolves curated gym terminology without crossing variants',()=>{
 for(const [name,id] of [['לחיצת חזה אופקית בדמבלים','bench'],['כפיפת ברכיים במכונה במנח שכיבה על הבטן','lying-curl'],['Barbell horizontal bench press','barbell-bench'],['Chest fly with cables','cable-fly']])assert.equal(match(name).exerciseId,id,name);
});
test('verified token order is independent in mixed language import names',()=>{
 for(const [name,id] of [['press bench dumbbell flat','bench'],['בכבל מעל הראש פשיטת מרפקים','cable-overhead-triceps'],['curl leg seated','seated-curl']])assert.equal(match(name).exerciseId,id,name);
});
test('unknown and contradictory qualifiers cannot auto assign',()=>{
 for(const name of ['incline flat dumbbell bench press','barbell machine bench press','standing seated dumbbell shoulder press','left right single arm dumbbell row','decline press bench dumbbell','smith barbell bench press','single leg bilateral RDL','dumbbell bench press not barbell','cable chest fly incline unknown'])assert.equal(match(name).exerciseId,'',name);
});
test('general parents and strict matching preserve their existing distinct policy',()=>{
 assert.equal(match('Bench Press').exerciseId,'');
 assert.equal(match('Bench Press',undefined,{allowGeneralMovement:true}).exerciseId,'movement-chest-press');
 assert.equal(match('Leg Curl').status,'ambiguous');
 assert.equal(match('Leg Curl',undefined,{allowGeneralMovement:true}).exerciseId,'movement-leg-curl');
});

test('qualifier parser exposes equipment angle grip laterality position movement and conflicts',async()=>{
 const {parseExerciseQualifiers:parse}=await import('../lib/exercise-qualifiers.ts');
 const q=parse('incline DB chest press seated narrow grip single arm');
 assert.deepEqual(q.equipment,['dumbbell']);assert.deepEqual(q.angle,['incline']);assert.deepEqual(q.grip,['narrow']);assert.deepEqual(q.laterality,['unilateral']);assert.deepEqual(q.position,['seated']);assert.ok(q.movement.includes('press'));assert.equal(q.conflict,false);
 for(const name of ['מוט סמית חופשי','incline flat press','sitting standing shoulder press','single arm bilateral row','left right single arm row'])assert.equal(parse(name).conflict,true,name);
 assert.deepEqual(parse('הרחקת ירך במכונה בישיבה').equipment,['machine']);
});
test('audit counts normalized unique alternatives excluding canonical names and reports collisions',async()=>{
 const {auditExerciseAliases}=await import('../scripts/audit-exercise-aliases.mjs');
 const catalog=[{id:'one',name:'אחד',en:'First',aliases:['first','DB curl','dumbbell curl','Shared']},{id:'two',name:'שניים',en:'Second',aliases:['Shared']}];
 const r=auditExerciseAliases(catalog,{});
 assert.equal(r.rows[0].aliasCount,2);assert.equal(r.rows[1].aliasCount,1);assert.deepEqual(r.collisions,[{normalized:'shared',exerciseIds:['one','two']}]);
 assert.deepEqual(r,auditExerciseAliases(catalog,{}));
});

test('every curated literal either selects its ID or an audited overlapping parent/name',async()=>{
 const {exercises}=await import('../lib/content.ts');
 const {exerciseAliases}=await import('../lib/exercise-aliases.ts');
 const {normalizeImportExerciseName:normalize}=await import('../lib/exercise-matching.ts');
 for(const e of exercises)for(const name of exerciseAliases[e.id]??[]){
  const result=match(name,exercises,{allowGeneralMovement:true});
  if(result.exerciseId===e.id)continue;
  const selected=exercises.find(x=>x.id===result.exerciseId);
  // Existing canonical duplicates/general-parent policy only; no specific
  // equipment, angle or posture may silently resolve to another variant.
  assert.ok(selected?.id.startsWith('movement-'),e.id+': '+name+' => '+result.exerciseId);
  const key=normalize(name).split(' ').sort().join(' ');
  assert.ok([selected.name,selected.en,...selected.aliases??[],...exerciseAliases[selected.id]??[]].some(n=>normalize(n).split(' ').sort().join(' ')===key));
 }
});
test('adding qualifier words or substituting incompatible implements cannot exploit token order',()=>{
 const cases=['press bench dumbbell decline','press bench dumbbell flat incline','row dumbbell single arm bilateral','extension triceps cable overhead barbell','curl leg seated lying','machine free smith squat','press DB BB bench','עליון שלילי שיפוע במוט לחיצת חזה'];
 for(const name of cases)assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);
});

test('anatomically wrong or directionless phrases are never verified for a specific movement',()=>{
 for(const name of ['כפיפת ירך אחורית בישיבה במכונה','משיכת פולי לגב','משיכת פולי באחיזה בינונית','Side lying hip raise'])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);
});
test('audit exposes token-equivalent counts separately from literal normalized counts',async()=>{
 const {auditExerciseAliases}=await import('../scripts/audit-exercise-aliases.mjs');
 const r=auditExerciseAliases([{id:'x',name:'אחד',en:'DB curl',aliases:['curl dumbbell','Other phrase','phrase other']}],{});
 assert.equal(r.rows[0].aliasCount,3);assert.equal(r.rows[0].tokenDistinctAliasCount,1);
});

test('observed workbook names resolve only existing semantically identical variants',()=>{
 for(const [name,id] of [['hip thurst','hip-thrust'],['הרחקת רגליים בעמידה נגד פולי','cable-abduction'],['כתף אחורית- הרחקה אופקית בישיבה במכונה','reverse-pec-deck'],['קירוב אופקי בישיבה במכונה','chest-fly'],['פשיטת רגליים','leg-extension'],['סיבוב כתף חיצוני כנגד פולי באחיזה נייטרלית','cable-er']])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,id,name);
});
test('unqualified cable triceps extensions cannot silently select pushdown over overhead',()=>{
 for(const name of ['Pulley triceps extension','Cable elbow extension','יד אחורית בכבל','tricep extension pully','Tricep extension pulley with straight bar'])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);
});

test('literal-only consumers can skip fuzzy suggestions without changing normal import review',()=>{
 const name='Dumbbel bench press';assert.ok(match(name).candidates.length>0);
 assert.deepEqual(match(name,undefined,{allowGeneralMovement:true,suggestions:false}),{exerciseId:'',status:'unmatched',confidence:0,candidates:[]});
 assert.equal(match('DB Bench Press',undefined,{suggestions:false}).exerciseId,'bench');
});

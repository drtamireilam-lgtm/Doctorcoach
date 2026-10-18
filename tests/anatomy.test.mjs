import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import { Mesh, SphereGeometry, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
const temp=await mkdtemp(join(tmpdir(),'doctorcoach-anatomy-'));
try {
 const data=await readFile('src/anatomy/data.ts','utf8');
 const records=await readFile('src/anatomy/muscles.json','utf8');
 const library=ts.transpile(await readFile('src/exercise-library.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020});
 await writeFile(join(temp,'library.mjs'),library);
 const compiled=ts.transpile(data.replace("import records from './muscles.json';",`const records = ${records};`).replace("'../exercise-library'","'./library.mjs'"),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020});
 await writeFile(join(temp,'data.mjs'),compiled);
 const {muscles,exerciseMuscleLinks,relatedExercises,abductionAngle}=await import(join(temp,'data.mjs'));
 assert.equal(muscles.length,15); assert.equal(new Set(muscles.map(m=>m.id)).size,15);
 for(const m of muscles){for(const k of ['he','en','location','origin','insertion','innervation','actions','simple','professional'])assert.ok(m[k]?.length>3,`${m.id}: ${k}`);assert.equal(m.position.length,3);assert.ok(m.scale.every(n=>n>0));assert.ok(['superficial','deep'].includes(m.layer));}
 for(const l of exerciseMuscleLinks){assert.ok(muscles.some(m=>m.id===l.muscleId));assert.ok(relatedExercises(l.muscleId).every(x=>x.exercise));assert.ok(['primary','secondary','stabilizer'].includes(l.role));}
 assert.equal(new Set(exerciseMuscleLinks.map(l=>`${l.exerciseId}:${l.muscleId}`)).size,exerciseMuscleLinks.length);
 assert.equal(abductionAngle(0),0);assert.equal(abductionAngle(3),Math.PI/2);assert.equal(abductionAngle(6),0);
 for(let t=0;t<=12;t+=.01)assert.ok(abductionAngle(t)>=0&&abductionAngle(t)<=Math.PI/2);
 assert.ok(!(await readFile('src/main.tsx','utf8')).includes('./anatomy'));
 const policy=ts.transpile(await readFile('src/anatomy/interaction.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020});
 await writeFile(join(temp,'interaction.mjs'),policy);
 const {muscleFromHash,nextZoomDistance,isSelectionClick}=await import(join(temp,'interaction.mjs'));
 const ids=muscles.map(m=>m.id);
 for(const id of ids)assert.equal(muscleFromHash(`#${id}`,ids),id);
 for(const hash of ['', '#missing', '#%E0%A4%A', '#%'])assert.equal(muscleFromHash(hash,ids),'pectoralis-major');
 assert.equal(muscleFromHash('#pectoralis%2Dminor',ids),'pectoralis-minor');
 assert.equal(nextZoomDistance(3,1),3);assert.equal(nextZoomDistance(10,-1),10);
 assert.equal(nextZoomDistance(7,1),6.5);assert.equal(nextZoomDistance(7,-1),7.5);
 assert.equal(isSelectionClick(0),true);assert.equal(isSelectionClick(4),true);
 assert.equal(isSelectionClick(5),false);assert.equal(isSelectionClick(NaN),false);
 // Three.js CPU raycast validates proxy volumes only, not DOM event wiring or rendering.
 const geometry=new SphereGeometry(1,24,16); const material=new MeshBasicMaterial();
 for(const m of muscles){
   const mesh=new Mesh(geometry,material);mesh.position.fromArray(m.position);mesh.scale.fromArray(m.scale);mesh.updateMatrixWorld();
   const origin=new Vector3(...m.position).add(new Vector3(0,0,3));
   const hits=new Raycaster(origin,new Vector3(0,0,-1)).intersectObject(mesh);
   assert.ok(hits.length>0,`${m.id} proxy must have selectable volume`);
 }
 geometry.dispose();material.dispose();
 console.log('PASS: hash decoding/invalid links, all 15 deep links, pointer click/drag policy, zoom bounds relative to current camera distance, CPU mesh raycasts. Browser/device behavior NOT tested.');
 console.log('PASS: 15 unique muscle records, complete draft fields, geometry parameters, valid existing exercise IDs/roles, animation bounds and app isolation.');
}finally{await rm(temp,{recursive:true,force:true});}

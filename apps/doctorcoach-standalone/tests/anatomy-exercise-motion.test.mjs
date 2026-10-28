import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {motionProfile,exercisePoseAngle,rotateJointPoint} from '../lib/anatomy-exercise-motion.ts';
import {createExerciseRig} from '../lib/anatomy-motion-rig.ts';
import {anatomyModels} from '../lib/anatomy-models.ts';
import {exercises} from '../lib/content.ts';
const profile=()=>motionProfile('barbell-curl');
test('one existing exercise ID resolves a source-bound prototype, without claiming muscle skinning',()=>{
 const p=profile();assert.ok(p);assert.equal(exercises.filter(e=>e.id===p.exerciseId).length,1);assert.equal(motionProfile('back-squat'),undefined);
 assert.equal(p.muscleMotion,'neutral-reference-only');assert.equal(p.review,'pending');assert.equal(p.maxDegrees,100);assert.equal(p.joints.length,2);
 for(const side of ['left','right'])for(const id of ['biceps-brachii','brachialis','brachioradialis'])assert.ok(p.roles[side+'-'+id]);
});
test('motion is finite, periodic, bounded and begins/ends at neutral',()=>{
 const p=profile();assert.equal(exercisePoseAngle(0,p),0);assert.equal(exercisePoseAngle(p.secondsPerRep,p),0);assert.equal(exercisePoseAngle(p.secondsPerRep/2,p),100);
 for(let t=0;t<100;t+=.013){const a=exercisePoseAngle(t,p);assert.ok(Number.isFinite(a)&&a>=0&&a<=100);}
 assert.equal(exercisePoseAngle(NaN,p),0);assert.equal(exercisePoseAngle(-1,p),0);
});
test('rigid elbow rotation fixes the pivot, preserves length and flexes both wrists anteriorly',()=>{
 for(const j of profile().joints){const wrist=[j.pivot[0]+(j.side==='left'?.04:-.04),.807,.115];const transformed=rotateJointPoint(wrist,j,100);assert.ok(transformed[2]>wrist[2]);assert.deepEqual(rotateJointPoint(j.pivot,j,100),j.pivot);const d=p=>Math.hypot(...p.map((n,i)=>n-j.pivot[i]));assert.ok(Math.abs(d(wrist)-d(transformed))<1e-10);assert.deepEqual(rotateJointPoint(wrist,j,0),wrist);}
});
test('runtime adapter preserves source buffers, only moves declared descendants and resets neutral muscle reference',()=>{
 const model=anatomyModels.find(m=>m.id==='musculoskeletal'),p=profile(),root=new THREE.Group(),meshes=[];
 const raw=gunzipSync(readFileSync(new URL('../public'+model.src,import.meta.url)));const n=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+n)),binary=raw.subarray(28+n),nodes=new Map(doc.nodes.map(n=>[n.name,n]));
 for(const s of model.structures){const primitive=doc.meshes[nodes.get(s.id).mesh].primitives[0],a=doc.accessors[primitive.attributes.POSITION],v=doc.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0);const pos=new Float32Array(binary.buffer.slice(binary.byteOffset+start,binary.byteOffset+start+a.count*12));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());m.name=s.id;root.add(m);meshes.push(m);}
 const target=meshes.find(m=>m.name==='right-radius'),fixed=meshes.find(m=>m.name==='right-humerus'),original=target.geometry.attributes.position.array.slice();root.updateMatrixWorld(true);const rest=target.localToWorld(new THREE.Vector3().fromArray(original,0));
 assert.throws(()=>createExerciseRig(root,meshes,{...model,asset:{...model.asset,glbSha256:'bad'}},p),/source/i);
 const rig=createExerciseRig(root,meshes,model,p);
 const bones=meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='bone'),batches=[];root.traverse(m=>{if(m.isMesh&&m.userData.motionBoneBatch)batches.push(m);});assert.equal(batches.length,3,'static bones and each moving arm need only three draw batches');assert.ok(bones.every(m=>!m.layers.test(new THREE.Layers())));assert.equal(batches.reduce((n,m)=>n+m.geometry.attributes.position.count,0),bones.reduce((n,m)=>n+m.geometry.attributes.position.count,0),'batching retains every source vertex');
 rig.pose(100,'motion',true,true);root.updateMatrixWorld(true);assert.ok(target.localToWorld(new THREE.Vector3().fromArray(original,0)).distanceTo(rest)>.01);assert.deepEqual(target.geometry.attributes.position.array,original);assert.equal(fixed.parent,root);
 assert.ok(meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='muscle').every(m=>!m.visible));
 rig.pose(100,'muscles',true,true);root.updateMatrixWorld(true);assert.ok(target.localToWorld(new THREE.Vector3().fromArray(original,0)).distanceTo(rest)<1e-7);assert.ok(meshes.find(m=>m.name==='left-biceps-brachii').visible);assert.ok(!meshes.find(m=>m.name==='right-gluteus-maximus').visible);
 rig.pose(0,'muscles',false,true);assert.equal(target.visible,false);rig.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});

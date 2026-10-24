import test from 'node:test';
import assert from 'node:assert/strict';
import {jointRegions,jointMovements,movementById,channelsFor} from '../lib/anatomy-joint-movements.ts';
import {loopProgress,initialPlayback,advancePlayback,resetPlayback,setPlaybackSpeed,togglePlayback} from '../lib/anatomy-joint-playback.ts';
import {anatomyModels} from '../lib/anatomy-models.ts';
import {createJointRig} from '../lib/anatomy-joint-rig.ts';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
test('all requested regions are inventoried; unavailable movements cannot silently become generic rotations',()=>{
 assert.equal(jointRegions.length,14);assert.equal(new Set(jointMovements.map(m=>m.id)).size,jointMovements.length);
 const model=anatomyModels.find(m=>m.id==='musculoskeletal'),ids=new Set(model.structures.map(s=>s.id));
 for(const m of jointMovements){assert.ok(m.en&&m.he&&m.reference);assert.equal(m.review,'source-calibration-pending');if(m.physiologicalRom){assert.ok(m.physiologicalRom.context&&m.physiologicalRom.source);assert.ok(m.physiologicalRom.degrees>=0);}
  for(const side of ['left','right','both']){const channels=channelsFor(m,side);if(m.status==='blocked'){assert.equal(channels.length,0);assert.ok(m.reason.en&&m.reason.he);}else{assert.ok(channels.length);for(const c of channels){assert.ok(c.bones.every(id=>ids.has(id)));assert.ok(c.bones.length);assert.ok(c.axis.every(Number.isFinite));assert.ok(Math.hypot(...c.axis)>0);if(side!=='both')assert.ok(c.bones.every(id=>id.includes(side)));}}}
 }
 assert.equal(movementById('thumb-opposition').status,'blocked');assert.equal(movementById('knee-internal-rotation').status,'blocked');
});
test('cosine loops are bounded and continuous with zero endpoint velocity',()=>{
 assert.equal(loopProgress(0),0);assert.equal(loopProgress(.5),1);assert.equal(loopProgress(1),0);assert.equal(loopProgress(NaN),0);
 for(let t=0;t<3;t+=.003)assert.ok(loopProgress(t)>=0&&loopProgress(t)<=1);
 const h=1e-6;assert.ok(Math.abs(loopProgress(h)-loopProgress(-h))<1e-9);assert.ok(loopProgress(h)/h<.001);
});
test('pure playback preserves phase while paused and changing speed; reset extension to source neutral',()=>{
 const m=movementById('elbow-flexion');let s=initialPlayback(m);assert.equal(s.playing,false);assert.equal(advancePlayback(s,2,m).phase,s.phase);
 s=togglePlayback(s);const p=advancePlayback(s,1,m);assert.ok(p.phase>s.phase);assert.equal(setPlaybackSpeed(p,2).phase,p.phase);assert.equal(setPlaybackSpeed(p,99).speed,1);
 const double=advancePlayback(setPlaybackSpeed(s,2),1,m);assert.ok(Math.abs(double.phase-2*p.phase)<1e-9);
 const r=resetPlayback(p,m);assert.equal(r.playing,false);assert.equal(r.phase,0);
 const e=movementById('elbow-extension'),er=resetPlayback(p,e);assert.equal(er.phase,.5);assert.equal(loopProgress(er.phase),1);
 assert.equal(initialPlayback(e).phase,.5);assert.equal(advancePlayback(p,NaN,m).phase,p.phase);
});
function sourceScene(){
 const model=anatomyModels.find(m=>m.id==='musculoskeletal'),root=new THREE.Group(),meshes=[];
 const raw=gunzipSync(readFileSync(new URL('../public'+model.src,import.meta.url))),n=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+n)),binary=raw.subarray(28+n),nodes=new Map(doc.nodes.map(n=>[n.name,n]));
 for(const s of model.structures){const p=doc.meshes[nodes.get(s.id).mesh].primitives[0],a=doc.accessors[p.attributes.POSITION],v=doc.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0);const pos=new Float32Array(binary.buffer.slice(binary.byteOffset+start,binary.byteOffset+start+a.count*12));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());m.name=s.id;root.add(m);meshes.push(m);}return {model,root,meshes};
}
test('source-bound generic rig moves independent sides, retains every source vertex and exactly resets',()=>{
 const {model,root,meshes}=sourceScene(),rest=new Map(meshes.map(m=>[m.name,m.geometry.attributes.position.array.slice()]));
 assert.throws(()=>createJointRig(root,meshes,{...model,asset:{...model.asset,glbSha256:'changed'}}),/source/i);
 const rig=createJointRig(root,meshes,model);const point=id=>{root.updateMatrixWorld(true);return meshes.find(m=>m.name===id).localToWorld(new THREE.Vector3().fromArray(rest.get(id)));};
 for(const movement of jointMovements.filter(m=>m.status==='prototype'))for(const side of ['left','right','both']){
  rig.configure(movement,side);rig.pose(.25,false,true);const active=channelsFor(movement,side),boneSet=new Set(active.flatMap(c=>c.bones));assert.ok(active.length);
  const batches=[];root.traverse(m=>{if(m.userData.jointBoneBatch)batches.push(m);});const renderedVertices=batches.reduce((n,m)=>n+m.geometry.attributes.position.count,0);const allVertices=meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='bone'&&!m.name.endsWith('-patella')).reduce((n,m)=>n+m.geometry.attributes.position.count,0);assert.equal(renderedVertices,allVertices);
  let moved=false;for(const mesh of meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='bone')){const before=new THREE.Vector3().fromArray(rest.get(mesh.name));if(boneSet.has(mesh.name)){if(point(mesh.name).distanceTo(before)>.0001)moved=true;}else assert.ok(point(mesh.name).distanceTo(before)<1e-7,mesh.name+' incorrectly moved for '+movement.id);assert.deepEqual(mesh.geometry.attributes.position.array,rest.get(mesh.name));}assert.ok(moved,movement.id+' has no motion');
  rig.neutral(true,true);for(const mesh of meshes)assert.ok(point(mesh.name).distanceTo(new THREE.Vector3().fromArray(rest.get(mesh.name)))<1e-7);assert.ok(meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='muscle').every(m=>m.visible));
 }
 rig.configure(movementById('forearm-pronation'),'right');rig.pose(.5,false,true);assert.deepEqual(point('right-ulna').toArray(),new THREE.Vector3().fromArray(rest.get('right-ulna')).toArray());
 for(const side of ['left','right']){const id='distal-phalanx-of-'+side+'-big-toe';rig.configure(movementById('hip-internal-rotation'),side);rig.pose(.25,false,true);assert.ok((point(id).x-rest.get(id)[0])*(side==='right'?1:-1)>0,'internal rotation must bring each forefoot medially');}
 rig.configure(movementById('elbow-flexion'),'both');rig.neutral(true,true,movementById('thumb-opposition'),'left');assert.ok(meshes.filter(m=>model.structures.find(s=>s.id===m.name).layer==='muscle').every(m=>m.material.color.getHex()!==0xef7858),'blocked movements must clear previous muscle associations');
 assert.throws(()=>rig.configure(movementById('thumb-opposition'),'both'),/unavailable/i);
 rig.dispose();assert.ok(meshes.every(m=>m.parent===root&&m.layers.mask===1));for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});




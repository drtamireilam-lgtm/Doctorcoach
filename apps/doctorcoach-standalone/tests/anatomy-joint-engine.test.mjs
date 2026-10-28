import test from 'node:test';
import assert from 'node:assert/strict';
import {jointRegions,jointMovements,movementById,channelsFor} from '../lib/anatomy-joint-movements.ts';
import {loopProgress,initialPlayback,advancePlayback,resetPlayback,setPlaybackSpeed,togglePlayback} from '../lib/anatomy-joint-playback.ts';
import {anatomyModels} from '../lib/anatomy-models.ts';
import {createJointRig} from '../lib/anatomy-joint-rig.ts';
import {jointContext} from '../lib/anatomy-joint-context.ts';
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
test('finger MCP spread uses a mirrored source palm plane, fixes middle/metacarpals and preserves IP distances',()=>{
 const spread=movementById('fingers-abduction'),returning=movementById('fingers-adduction');assert.equal(spread.status,'prototype');assert.equal(returning.status,'prototype');assert.equal(initialPlayback(returning).phase,.5);
 const {root,meshes,model}=sourceScene(),rig=createJointRig(root,meshes,model);const rest=new Map(meshes.map(m=>[m.name,new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,0)]));
 const point=id=>{root.updateMatrixWorld(true);return meshes.find(m=>m.name===id).localToWorld(rest.get(id).clone());};
 for(const side of ['left','right','both']){
  rig.configure(spread,side);rig.pose(.5);const activeSides=side==='both'?['left','right']:[side];
  for(const s of activeSides){for(const digit of ['index','ring','little']){const id='distal-phalanx-of-'+s+'-'+digit+'-finger',sign=(s==='right'?-1:1)*(digit==='index'?1:-1);assert.ok((point(id).x-rest.get(id).x)*sign>0,'digit must spread away from middle reference');const proximal='proximal-phalanx-of-'+s+'-'+digit+'-finger';assert.ok(Math.abs(point(id).distanceTo(point(proximal))-rest.get(id).distanceTo(rest.get(proximal)))<1e-8,'IP chain must remain rigid');}
   for(const id of [s+'-second-metacarpal-bone',s+'-third-metacarpal-bone','distal-phalanx-of-'+s+'-middle-finger'])assert.ok(point(id).distanceTo(rest.get(id))<1e-8);
  }
  if(side!=='both'){const other=side==='right'?'left':'right';for(const digit of ['index','ring','little']){const id='distal-phalanx-of-'+other+'-'+digit+'-finger';assert.ok(point(id).distanceTo(rest.get(id))<1e-8);}}
  rig.configure(returning,side);rig.pose(initialPlayback(returning).phase);for(const m of meshes)assert.ok(point(m.name).distanceTo(rest.get(m.name))<1e-8);
 }
 rig.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});
test('a degenerate source plane fails closed and restores owned source objects',()=>{
 const spread=movementById('fingers-abduction');assert.equal(spread.status,'prototype');const {root,meshes,model}=sourceScene(),rig=createJointRig(root,meshes,model);
 const bad={...spread,build:side=>spread.build(side).map(c=>({...c,axisPlane:{origin:{bone:side+'-third-metacarpal-bone',end:'proximal'},longitudinal:{bone:side+'-third-metacarpal-bone',end:'proximal'},radial:{bone:side+'-third-metacarpal-bone',end:'proximal'}}}))};
 assert.throws(()=>rig.configure(bad,'right'),/plane/i);assert.ok(meshes.every(m=>m.parent===root&&m.position.length()===0));rig.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});
test('joint context includes every animated bone and proximal support while excluding unrelated anatomy',()=>{
 const model=anatomyModels.find(m=>m.id==='musculoskeletal');
 for(const m of jointMovements)for(const side of ['left','right','both']){const c=jointContext(model,m,side);if(m.status==='blocked'){assert.equal(c.bones.size,0);continue;}for(const id of channelsFor(m,side).flatMap(c=>c.bones))assert.ok(c.bones.has(id));assert.ok(!c.bones.has('frontal-bone'));for(const id of c.bones)assert.equal(model.structures.find(s=>s.id===id).layer,'bone');}
 const elbow=jointContext(model,movementById('elbow-flexion'),'right');assert.ok(elbow.bones.has('right-humerus'));assert.ok(elbow.bones.has('right-radius'));assert.ok(!elbow.bones.has('left-humerus'));
 const hand=jointContext(model,movementById('fingers-abduction'),'left');assert.ok(hand.bones.has('left-third-metacarpal-bone'));assert.ok(!hand.bones.has('left-femur'));assert.ok([...hand.muscles].every(id=>model.structures.find(s=>s.id===id).side==='left'));
});
test('focused scope retains pose/source geometry and reduces rendered bone vertices without hiding active parts',()=>{
 const {root,meshes,model}=sourceScene(),rig=createJointRig(root,meshes,model),movement=movementById('elbow-flexion');rig.configure(movement,'right');rig.pose(.23);
 const radius=meshes.find(m=>m.name==='right-radius'),position=()=>{root.updateMatrixWorld(true);return radius.localToWorld(new THREE.Vector3().fromBufferAttribute(radius.geometry.attributes.position,0));},before=position();
 const visibleVertices=()=>{let count=0;root.traverse(m=>{if(m.userData.jointBoneBatch&&m.visible)count+=m.geometry.attributes.position.count;});return count;};const bodyCount=visibleVertices();
 rig.setScope('joint');assert.ok(position().distanceTo(before)<1e-9);assert.ok(visibleVertices()<bodyCount*.5);assert.ok(meshes.find(m=>m.name==='right-humerus').visible);assert.ok(!meshes.find(m=>m.name==='left-humerus').visible);assert.ok(!meshes.find(m=>m.name==='right-femur').visible);
 for(const id of channelsFor(movement,'right').flatMap(c=>c.bones))assert.ok(meshes.find(m=>m.name===id).visible);
 rig.neutral(true,true,movement,'right');assert.ok(!meshes.find(m=>m.name==='left-biceps-brachii').visible);assert.ok(meshes.find(m=>m.name==='right-biceps-brachii').visible);
 rig.setScope('body');rig.pose(.23);assert.equal(visibleVertices(),bodyCount);assert.ok(position().distanceTo(before)<1e-9);rig.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});




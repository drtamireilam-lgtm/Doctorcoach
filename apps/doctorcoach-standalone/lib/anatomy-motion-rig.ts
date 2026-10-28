import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AnatomyModel} from './anatomy-models.ts';
import {boundedDegrees,type ExerciseMotionProfile,type MotionMode} from './anatomy-exercise-motion.ts';

/** Opt-in instance-local rigid adapter. Source buffers and the static atlas are untouched. */
export function createExerciseRig(root:THREE.Object3D,meshes:THREE.Mesh[],model:AnatomyModel,profile:ExerciseMotionProfile){
 if(model.id!==profile.modelId||model.asset.glbSha256!==profile.assetSha256)throw new Error('Motion source requires re-audit');
 const byId=new Map(model.structures.map(s=>[s.id,s]));
 for(const id of Object.keys(profile.roles))if(!byId.has(id)||byId.get(id)?.layer!=='muscle')throw new Error('Missing source muscle: '+id);
 const groups:THREE.Group[]=[],markers:THREE.Mesh[]=[],axes:THREE.Vector3[]=[],batches:THREE.Mesh[]=[],boneLayers=new Map<THREE.Mesh,number>();
 for(const joint of profile.joints){
  const descendants=meshes.filter(m=>{const s=byId.get(m.name);return s?.layer==='bone'&&s.side===joint.side&&joint.regions.includes(s.regionId??'');});
  if(descendants.length!==29)throw new Error('Unexpected source forearm/hand inventory');
  for(const mesh of descendants)if(mesh.position.length()>1e-9||mesh.quaternion.angleTo(new THREE.Quaternion())>1e-9||!mesh.scale.equals(new THREE.Vector3(1,1,1)))throw new Error('Unexpected source transforms');
 }
 for(const joint of profile.joints){
  const group=new THREE.Group();group.name='motion-'+joint.id;group.position.fromArray(joint.pivot);root.add(group);groups.push(group);axes.push(new THREE.Vector3(...joint.axis).normalize());
  for(const mesh of meshes){const s=byId.get(mesh.name);if(s?.layer==='bone'&&s.side===joint.side&&joint.regions.includes(s.regionId??'')){group.add(mesh);mesh.position.sub(group.position);}}
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),new THREE.MeshBasicMaterial({color:0xffce54,depthTest:false,transparent:true,opacity:.8}));marker.position.fromArray(joint.pivot);marker.renderOrder=3;marker.visible=false;root.add(marker);markers.push(marker);
 }
 // Same source vertices/triangles, three draw calls instead of 201. Originals remain
 // as picking proxies on a non-camera layer; no atlas asset or geometry is edited.
 for(const parent of [root,...groups]){
  const originals=meshes.filter(m=>byId.get(m.name)?.layer==='bone'&&m.parent===parent);
  const copies=originals.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
  const geometry=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());
  if(!geometry)throw new Error('Unable to batch source bones');
  const batch=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xe5dac2,roughness:.8,metalness:0,side:THREE.DoubleSide}));batch.userData.motionBoneBatch=true;parent.add(batch);batches.push(batch);
  originals.forEach(m=>{boneLayers.set(m,m.layers.mask);m.layers.set(1);});
 }
 let disposed=false;
 const rig={pose(degrees:number,mode:MotionMode,bones=true,muscles=true){
  if(disposed)return;const neutral=mode==='muscles',angle=neutral?0:-boundedDegrees(degrees,profile.maxDegrees)*Math.PI/180;
  groups.forEach((g,i)=>g.quaternion.setFromAxisAngle(axes[i],angle));markers.forEach(m=>{m.visible=mode==='joints'&&bones;});
  for(const batch of batches){batch.visible=bones;const material=batch.material as THREE.MeshStandardMaterial;material.transparent=neutral;material.opacity=neutral?.2:1;material.depthWrite=!neutral;}
  for(const mesh of meshes){const s=byId.get(mesh.name);if(!s)continue;const role=profile.roles[s.id];mesh.visible=s.layer==='bone'?bones:neutral&&muscles&&!!role;
   const color=s.layer==='bone'?0xe5dac2:role==='primary'?0xef7858:role==='secondary'?0xf7c653:0x58bde9;
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial){material.color.setHex(color);material.transparent=neutral&&s.layer==='bone';material.opacity=neutral&&s.layer==='bone'?.2:1;material.depthWrite=!(neutral&&s.layer==='bone');}
  }
 },dispose(){if(disposed)return;disposed=true;for(const mesh of [...markers,...batches]){mesh.parent?.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}for(const [mesh,mask] of boneLayers)mesh.layers.mask=mask;for(const group of groups){for(const mesh of [...group.children]){root.add(mesh);mesh.position.add(group.position);}root.remove(group);}}};
 rig.pose(0,'motion');return rig;
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AnatomyModel} from './anatomy-models.ts';
import {channelsFor,jointAssetSha,type JointChannel,type JointMovement,type JointSide,type Landmark} from './anatomy-joint-movements.ts';
import {loopProgress} from './anatomy-joint-playback.ts';

/** Owned scene only: unchanged source buffers, provisional source-coordinate pivots. */
export function createJointRig(root:THREE.Object3D,meshes:THREE.Mesh[],model:AnatomyModel){
 if(model.id!=='musculoskeletal'||model.asset.glbSha256!==jointAssetSha)throw new Error('Joint source requires re-audit');
 if(meshes.length!==379||meshes.some(m=>m.parent!==root||m.position.length()>1e-9||m.quaternion.angleTo(new THREE.Quaternion())>1e-9||!m.scale.equals(new THREE.Vector3(1,1,1))))throw new Error('Unexpected joint source transforms');
 const specs=new Map(model.structures.map(s=>[s.id,s])),byId=new Map(meshes.map(m=>[m.name,m]));
 const layers=new Map(meshes.map(m=>[m,m.layers.mask]));let groups:THREE.Group[]=[],batches:THREE.Mesh[]=[],channels:JointChannel[]=[],axes:THREE.Vector3[]=[],disposed=false,associated=new Set<string>();
 function associate(movement:JointMovement,side:JointSide){associated=new Set(model.structures.filter(s=>s.layer==='muscle'&&(side==='both'||s.side===side)&&movement.muscles.includes(s.learningId??s.id.replace(/^(left|right)-/,''))).map(s=>s.id));}
 function locate(p:Landmark|readonly [number,number,number]):THREE.Vector3{
  if(Array.isArray(p))return new THREE.Vector3(...p);
  const point=p as Landmark,mesh=byId.get(point.bone);if(!mesh)throw new Error('Missing landmark source');
  const geometry=mesh.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();const box=geometry.boundingBox!,result=box.getCenter(new THREE.Vector3());
  // End-cap centroids are explicit approximations, not articular landmark validation.
  const dim=point.bone.includes('-toe')?2:1,prox=point.end==='proximal',low=dim===2?prox:!prox,min=box.min.getComponent(dim),max=box.max.getComponent(dim),span=max-min;
  const sum=new THREE.Vector3(),v=new THREE.Vector3();let count=0;const positions=geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i);if(low?v.getComponent(dim)<min+span*.12:v.getComponent(dim)>max-span*.12){sum.add(v);count++;}}
  if(count)result.copy(sum.divideScalar(count));
  if(prox&&point.bone.endsWith('-humerus'))result.y=max-.02;
  if(prox&&point.bone.endsWith('-femur')){result.x=point.bone.startsWith('right')?box.max.x-.019:box.min.x+.019;result.y=box.max.y-.019;}
  return result;
 }
 function clear(){
  for(const batch of batches){batch.removeFromParent();batch.geometry.dispose();(batch.material as THREE.Material).dispose();}batches=[];
  // Mesh vertices are already in source coordinates; detach without preserving pose.
  for(const mesh of meshes){root.add(mesh);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);mesh.layers.mask=layers.get(mesh)!;}
  for(const group of groups)group.removeFromParent();groups=[];axes=[];channels=[];
 }
 function configure(movement:JointMovement,side:JointSide){
  if(disposed)throw new Error('Joint rig disposed');if(movement.status!=='prototype')throw new Error('Movement unavailable');
  const next=channelsFor(movement,side),ids=new Set<string>();
  for(const c of next){if(ids.has(c.id)||c.bones.some(id=>specs.get(id)?.layer!=='bone')||c.bones.length===0||c.parent&&!ids.has(c.parent))throw new Error('Invalid joint channels');ids.add(c.id);}
  clear();channels=next;associate(movement,side);
  try{
   const pivots=channels.map(c=>locate(c.pivot));
   axes=channels.map((c,i)=>{
    if(c.axisPlane){
     if(c.axisEnd)throw new Error('Ambiguous source plane axis');
     const origin=locate(c.axisPlane.origin),long=locate(c.axisPlane.longitudinal).sub(origin),radial=locate(c.axisPlane.radial).sub(origin),normal=long.clone().cross(radial),product=long.lengthSq()*radial.lengthSq();
     if(!Number.isFinite(product)||product<1e-16||!Number.isFinite(normal.lengthSq())||normal.lengthSq()/product<1e-4)throw new Error('Degenerate source plane');
     return normal.normalize();
    }
    return c.axisEnd?locate(c.axisEnd).sub(pivots[i]).normalize().multiplyScalar(c.axis[0]):new THREE.Vector3(...c.axis).normalize();
   });
   if(axes.some(a=>a.lengthSq()<.99))throw new Error('Invalid source joint axis');
   channels.forEach((c,i)=>{const group=new THREE.Group();group.name=c.id;const parentIndex=c.parent?channels.findIndex(p=>p.id===c.parent):-1;const parent=parentIndex>=0?groups[parentIndex]:root;group.position.copy(pivots[i]);if(parentIndex>=0)group.position.sub(pivots[parentIndex]);parent.add(group);groups.push(group);});
   for(const mesh of meshes){const index=channels.findLastIndex(c=>c.bones.includes(mesh.name));if(index>=0){groups[index].add(mesh);mesh.position.copy(pivots[index]).negate();}}
   for(const parent of [root,...groups]){
    const originals=meshes.filter(m=>specs.get(m.name)?.layer==='bone'&&m.parent===parent&&!m.name.endsWith('-patella'));if(!originals.length)continue;
    const copies=originals.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});let geometry:THREE.BufferGeometry|null;
    try{geometry=mergeGeometries(copies,false);}finally{copies.forEach(g=>g.dispose());}
    if(!geometry)throw new Error('Source batching unavailable');const batch=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xe5dac2,roughness:.8,side:THREE.DoubleSide}));batch.userData.jointBoneBatch=true;parent.add(batch);batches.push(batch);
   }
   for(const mesh of meshes)if(specs.get(mesh.name)?.layer==='bone')mesh.layers.set(1);
   neutral(true,false);
  }catch(error){clear();throw error;}
 }
 function neutral(bones=true,muscles=false,movement?:JointMovement,side:JointSide='both'){
  if(disposed)return;if(movement)associate(movement,side);groups.forEach(g=>g.quaternion.identity());
  for(const batch of batches){batch.visible=bones;const mat=batch.material as THREE.MeshStandardMaterial;mat.transparent=muscles;mat.opacity=muscles?.2:1;mat.depthWrite=!muscles;}
  for(const mesh of meshes){const s=specs.get(mesh.name)!;mesh.visible=s.layer==='bone'?bones:muscles;if(mesh.name.endsWith('-patella'))mesh.layers.set(0);if(s.layer==='muscle')for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial)material.color.setHex(associated.has(s.id)?0xef7858:0x712e35);}
 }
 function pose(phase:number,reference=false,bones=true,muscles=false){
  if(disposed)return;if(reference){neutral(bones,muscles);return;}const progress=loopProgress(phase);
  channels.forEach((c,i)=>groups[i].quaternion.setFromAxisAngle(axes[i],THREE.MathUtils.degToRad(c.from+(c.to-c.from)*progress)));
  batches.forEach(batch=>{batch.visible=bones;const mat=batch.material as THREE.MeshStandardMaterial;mat.transparent=false;mat.opacity=1;mat.depthWrite=true;});
  for(const mesh of meshes){mesh.visible=specs.get(mesh.name)?.layer==='bone'&&bones&&!mesh.name.endsWith('-patella');if(mesh.name.endsWith('-patella'))mesh.layers.set(1);}
 }
 return {configure,pose,neutral,dispose(){if(disposed)return;clear();disposed=true;}};
}

import type {AnatomyModel} from './anatomy-models.ts';
import {channelsFor,type JointMovement,type JointSide} from './anatomy-joint-movements.ts';
export type JointScope='body'|'joint';
/** Whole source structures only: never crop, simplify or deform anatomical geometry. */
export function jointContext(model:AnatomyModel,movement:JointMovement,side:JointSide){
 const bones=new Set<string>(),muscles=new Set<string>();
 if(movement.status!=='prototype')return {bones,muscles};
 const regions:Record<string,readonly string[]>={
  shoulder:['shoulder','elbow','forearm','wrist_hand'],elbow:['elbow','forearm','wrist_hand'],forearm:['elbow','forearm','wrist_hand'],wrist:['forearm','wrist_hand'],fingers:['wrist_hand'],
  hip:['hip_glute','thigh','knee','lower_leg','ankle_foot'],knee:['thigh','knee','lower_leg','ankle_foot'],ankle:['lower_leg','ankle_foot'],toes:['ankle_foot'],
 };
 for(const s of model.structures){
  const selectedSide=side==='both'||s.side===side,region=regions[movement.region]?.includes(s.regionId??'');
  if(s.layer==='bone'&&selectedSide&&region)bones.add(s.id);
  if(s.layer==='muscle'&&selectedSide&&(region||movement.muscles.includes(s.learningId??'')))muscles.add(s.id);
 }
 for(const c of channelsFor(movement,side))for(const id of c.bones)bones.add(id);
 if(movement.region==='hip'&&model.structures.some(s=>s.id==='sacrum'&&s.layer==='bone'))bones.add('sacrum');
 return {bones,muscles};
}

import {createHash} from 'node:crypto';
export const sourceRevision='320805e06aee51e2e6f6b22533eb2a59d43f2d4d';
export const sourceSha='9744d3dffced835961104447d23a781ad469588289ce322d84d000e0d498326c';
export const sourceUrl=`https://raw.githubusercontent.com/Charleeh/ecorche/${sourceRevision}/model/ecorche.glb`;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalized=name=>name.toLowerCase().replace(/\b(left|right)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
/** Only metadata/material ownership changes. Source BIN, transforms and COLOR_0 stay byte-identical. */
export function convertDetailedAtlas(source,catalogue){
 if(digest(source)!==sourceSha)throw new Error('Detailed anatomy source checksum mismatch');
 const length=source.readUInt32LE(12),doc=JSON.parse(source.subarray(20,20+length));
 const materials=doc.materials,structures=[],owned=[];
 for(const node of doc.nodes){
  if(node.mesh===undefined)continue;
  const info=node.extras,mesh=doc.meshes[node.mesh];
  const id='detail-'+info.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
  if(structures.some(s=>s.id===id))throw new Error('Duplicate detailed structure ID');
  node.name=id;mesh.name=id;
  if(mesh.primitives.length!==1)throw new Error('Unexpected detailed primitive count');
  const primitive=mesh.primitives[0];
  owned.push({...structuredClone(materials[primitive.material]),name:id});primitive.material=owned.length-1;
  const depth=info.layer==='deep muscles'?'deep':info.layer==='superficial muscles'?'superficial':undefined;
  const layer=depth?'muscle':info.tissue==='bone'||info.tissue==='tooth'?'bone':info.tissue==='cartilage'?'cartilage':'surface';
  // Exact normalized names only; groups with conflicting catalogue IDs are not linked.
  const candidates=catalogue.filter(s=>s.layer===layer&&normalized(s.en)===normalized(info.name));
  const keys=new Set(candidates.map(s=>s.learningId??s.id.replace(/^(left|right)-/,'')));
  const mapping=keys.size===1?(candidates.find(s=>s.side===info.side)??candidates[0]):undefined;
  const he=mapping?mapping.he.replace(/ — (ימין|שמאל)$/,'')+(info.side==='left'?' — שמאל':info.side==='right'?' — ימין':''):info.name;
  structures.push({id,en:info.name,he,layer,side:info.side,depth,...(mapping?.learningId?{learningId:mapping.learningId,regionId:mapping.regionId}:{}),sources:[{elementId:`ecorche:${info.name}`,sha256:sourceSha,mappingRows:[info.source,info.fma??'',info.layer]}]});
 }
 if(structures.length!==634)throw new Error('Detailed source inventory changed');
 doc.materials=owned;
 const json=Buffer.from(JSON.stringify(doc));const pad=Buffer.alloc((4-json.length%4)%4,0x20);const jsonBytes=Buffer.concat([json,pad]);
 const header=Buffer.alloc(20);source.copy(header,0,0,12);header.writeUInt32LE(20+jsonBytes.length+source.length-20-length,8);header.writeUInt32LE(jsonBytes.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bytes=Buffer.concat([header,jsonBytes,source.subarray(20+length)]);
 const asset={assetId:'ecorche-detailed-body',glbSha256:digest(bytes),licenseId:'CC-BY-SA-4.0',licenseEvidence:'/anatomy/detailed-license.txt',attribution:'Écorché by Charleeh, derived from BodyParts3D © DBCLS and Z-Anatomy by Gauthier Kervyn; CC BY-SA 4.0.',anatomicalReview:'pending',sourceRevision,sourceSha,sourceUrl,modifications:'DoctorCoach: stable node IDs and individually owned material names only; upstream binary geometry, transforms and vertex colours preserved. Upstream geometry is simplified, displaced for layering and mirrored. Tendon tint is illustrative, not separate validated tendon geometry.',structures,unavailable:['calibrated-fibre-directions','separate-validated-tendons','ligaments','nerves','vessels','organs','clinical-validation']};
 return {bytes,structures,asset};
}

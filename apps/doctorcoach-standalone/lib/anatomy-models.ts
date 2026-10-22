import spine from './prepared/spine-model.json' with {type:'json'};
import shoulder from './prepared/shoulder-model.json' with {type:'json'};
import arm from './prepared/arm-model.json' with {type:'json'};
import forearm from './prepared/forearm-model.json' with {type:'json'};
import hand from './prepared/hand-model.json' with {type:'json'};
import lowerleg from './prepared/lowerleg-model.json' with {type:'json'};
import foot from './prepared/foot-model.json' with {type:'json'};
import knee from './prepared/knee-model.json' with {type:'json'};
import hip from './prepared/hip-model.json' with {type:'json'};
import body from './prepared/body-model.json' with {type:'json'};
import {inspectGlb} from './anatomy-glb-inventory.ts';
export type AtlasLayer='bone'|'muscle'|'surface';
export type AtlasStructure={id:string;he:string;en:string;layer:AtlasLayer;side:string;regionId?:string;sources:{elementId:string;sha256:string;mappingRows:string[]}[]};
export type AtlasAsset={glbSha256:string;licenseId:string;licenseEvidence:string;attribution:string;anatomicalReview:string;structures:AtlasStructure[];unavailable:string[]};
export type AnatomyModel={id:string;he:string;en:string;regions:string[];src:string;maxBytes:number;asset:AtlasAsset;structures:AtlasStructure[];overview?:boolean;sideNote?:{he:string;en:string};initialView?:'front'|'back'|'left'|'right';availabilityNote?:{he:string;en:string};initialFocus?:{structure:string;scale:number}};
export const anatomyModels:AnatomyModel[]=[
 {id:'body',he:'הגוף בתלת־ממד',en:'3D body navigator',regions:[],src:'/anatomy/body.glb',maxBytes:2*1024*1024,asset:body as AtlasAsset,structures:body.structures as AtlasStructure[],overview:true},
 {id:'shoulder',he:'כתף בתלת־ממד',en:'3D shoulder',regions:['shoulder'],src:'/anatomy/shoulder.glb',maxBytes:3*1024*1024,asset:shoulder as AtlasAsset,structures:shoulder.structures as AtlasStructure[]},
 {id:'arm',he:'זרוע ומרפק בתלת־ממד',en:'3D arm & elbow',regions:['elbow'],src:'/anatomy/arm.glb',maxBytes:3*1024*1024,asset:arm as AtlasAsset,structures:arm.structures as AtlasStructure[]},
 {id:'forearm',he:'אמה בתלת־ממד',en:'3D forearm',regions:['forearm'],src:'/anatomy/forearm.glb',maxBytes:3*1024*1024,asset:forearm as AtlasAsset,structures:forearm.structures as AtlasStructure[]},
 {id:'hand',he:'שורש כף היד וכף היד בתלת־ממד',en:'3D wrist & hand',regions:['wrist_hand'],src:'/anatomy/hand.glb',maxBytes:3*1024*1024,asset:hand as AtlasAsset,structures:hand.structures as AtlasStructure[]},
 {id:'hip',he:'מפרק הירך והאגן בתלת־ממד',en:'3D hip & pelvis',regions:['hip_glute'],src:'/anatomy/hip.glb',maxBytes:2*1024*1024,asset:hip as AtlasAsset,structures:hip.structures as AtlasStructure[]},
 {id:'knee',he:'הברך והשרירים החוצים אותה בתלת־ממד',en:'3D knee & crossing muscles',regions:['knee'],src:'/anatomy/knee.glb',maxBytes:3*1024*1024,asset:knee as AtlasAsset,structures:knee.structures as AtlasStructure[],initialFocus:{structure:'patella',scale:4},availabilityNote:{he:'מניסקוסים, רצועות צולבות וצדיות, סחוס וקופסית אינם כלולים. עצם האגן והעקב מוצגות להקשר של חיבורי השרירים.',en:'Menisci, cruciate and collateral ligaments, cartilage and capsule are not included. The hip bone and calcaneus provide muscle-attachment context.'}},
 {id:'lowerleg',he:'השוק בתלת־ממד',en:'3D lower leg',regions:['lower_leg'],src:'/anatomy/lowerleg.glb',maxBytes:3*1024*1024,asset:lowerleg as AtlasAsset,structures:lowerleg.structures as AtlasStructure[],initialFocus:{structure:'soleus',scale:1.3},availabilityNote:{he:'עצמות כף הרגל ועצם הירך מספקות הקשר לחיבורי השרירים. שרירי כף הרגל המקומיים, רצועות, סחוס ועצבים אינם כלולים במודל זה.',en:'Foot bones and the femur provide muscle-attachment context. Intrinsic foot muscles, ligaments, cartilage and nerves are not included in this model.'}},
 {id:'foot',he:'קרסול וכף הרגל בתלת־ממד',en:'3D ankle & foot',regions:['ankle_foot'],src:'/anatomy/foot.glb',maxBytes:3*1024*1024,asset:foot as AtlasAsset,structures:foot.structures as AtlasStructure[],initialView:'left',initialFocus:{structure:'talus',scale:6},availabilityNote:{he:'26 עצמות כף הרגל, עצמות השוק ותשעה שרירים זמינים. רצועות, סחוס, ססמואידים, עצבים ויתר שרירי כף הרגל אינם כלולים. אין גידים הניתנים לבחירה בנפרד.',en:'26 major foot bones, the tibia/fibula and nine muscles are available. Ligaments, cartilage, sesamoids, nerves and other foot muscles are not included. Tendons are not separately selectable.'}},
 {id:'spine',he:'גב ועמוד השדרה בתלת־ממד',en:'3D back & spine',regions:['lower_back_spine','upper_back_scapula'],src:'/anatomy/spine.glb',maxBytes:6*1024*1024,asset:spine as AtlasAsset,structures:spine.structures as AtlasStructure[],initialView:'back',sideNote:{he:'קו אמצע ומבנים מצד ימין',en:'Midline and right-sided structures'},availabilityNote:{he:'24 חוליות ועצם העצה בקו האמצע; עצמות להקשר ושמונה שרירים מצד ימין. דיסקים, רצועות, עצבים, חוט השדרה, עצם הזנב, הרחב הגבי, מולטיפידוס והמרובע המותני אינם כלולים. צוואר מפורט טרם זמין.',en:'24 vertebrae and sacrum at midline, right attachment-context bones and eight right back muscles. Discs, ligaments, nerves, spinal cord, coccyx, latissimus dorsi, multifidus and quadratus lumborum are not included. Detailed neck anatomy is pending.'}},
];
export const modelForRegion=(region:string)=>anatomyModels.find(m=>m.regions.includes(region));
export async function validateAnatomyAsset(bytes:ArrayBuffer,model:AnatomyModel){
 if(bytes.byteLength>model.maxBytes)throw new Error('Model exceeds budget');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 if(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')!==model.asset.glbSha256)throw new Error('Model checksum mismatch');
 const inventory=inspectGlb(bytes),expected=new Set(model.structures.map(s=>s.id));
 if(inventory.meshCount!==expected.size||inventory.meshNodeNames.length!==expected.size||inventory.meshNodeNames.some(n=>!expected.has(n)))throw new Error('Unexpected model mesh inventory');
 // A correct list of names is insufficient if node indices point to another structure's geometry.
 const length=new DataView(bytes).getUint32(12,true);
 const document=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
 const ownedMaterials=new Set<number>();
 for(const node of document.nodes){if(node.mesh===undefined)continue;const mesh=document.meshes[node.mesh];
  if(mesh.name!==node.name||mesh.primitives.length!==1)throw new Error('Unexpected anatomical mesh binding');
  const material=mesh.primitives[0].material;
  if(document.materials?.[material]?.name!==node.name||ownedMaterials.has(material))throw new Error('Unexpected anatomical material binding');
  ownedMaterials.add(material);
 }

}
export function visibleStructureIds(model:AnatomyModel,layers:ReadonlySet<AtlasLayer>,isolated:string|null){
 return model.structures.filter(s=>layers.has(s.layer)&&(!isolated||s.id===isolated)).map(s=>s.id);
}
export type CameraState={position:[number,number,number];target:[number,number,number]};
export function readCameraState(value:unknown):CameraState|null{
 if(!value||typeof value!=='object')return null;const v=value as CameraState;
 const valid=(a:unknown):a is [number,number,number]=>Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<20);
 if(!valid(v.position)||!valid(v.target)||Math.hypot(...v.position.map((n,i)=>n-v.target[i]))<.01)return null;
 return {position:[...v.position],target:[...v.target]};
}

/** Prefer the current mapped region; fallback only in explicit anatomy LAB mode. */
export function modelRegionForMuscle(id:string,preferred:string,enabled:boolean):string{
 if(!enabled||modelForRegion(preferred)?.structures.some(s=>s.id===id))return preferred;
 return anatomyModels.find(m=>!m.overview&&m.structures.some(s=>s.id===id))?.regions[0]??preferred;
}

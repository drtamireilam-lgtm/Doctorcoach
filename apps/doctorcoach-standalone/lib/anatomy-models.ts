import thigh from './prepared/thigh-model.json' with {type:'json'};
import neck from './prepared/neck-model.json' with {type:'json'};
import torso from './prepared/torso-model.json' with {type:'json'};
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
import skeleton from './prepared/skeleton-model.json' with {type:'json'};
import musculoskeletal from './prepared/musculoskeletal-model.json' with {type:'json'};
import {inspectGlb} from './anatomy-glb-inventory.ts';
export type AtlasLayer='bone'|'muscle'|'cartilage'|'surface';
export type AtlasStructure={id:string;he:string;en:string;layer:AtlasLayer;side:string;regionId?:string;learningId?:string;sources:{elementId:string;sha256:string;mappingRows:string[]}[]};
export type AtlasAsset={glbSha256:string;licenseId:string;licenseEvidence:string;attribution:string;anatomicalReview:string;structures:AtlasStructure[];unavailable:string[]};
export type AnatomyModel={id:string;he:string;en:string;regions:string[];src:string;maxBytes:number;asset:AtlasAsset;structures:AtlasStructure[];overview?:boolean;sideNote?:{he:string;en:string};coverageNote?:{he:string;en:string};initialView?:'front'|'back'|'left'|'right';availabilityNote?:{he:string;en:string};initialFocus?:{structure:string;scale:number}};
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
 {id:'spine',he:'גב ועמוד השדרה בתלת־ממד',en:'3D back & spine',regions:['lower_back_spine','upper_back_scapula'],src:'/anatomy/spine.glb',maxBytes:6*1024*1024,asset:spine as AtlasAsset,structures:spine.structures as AtlasStructure[],initialView:'back',sideNote:{he:'קו אמצע ומבנים מצד ימין',en:'Midline and right-sided structures'},availabilityNote:{he:'24 חוליות ועצם העצה בקו האמצע; עצמות להקשר ושמונה שרירים מצד ימין. דיסקים, רצועות, עצבים, חוט השדרה, עצם הזנב, הרחב הגבי, מולטיפידוס והמרובע המותני אינם כלולים.',en:'24 vertebrae and sacrum at midline, right attachment-context bones and eight right back muscles. Discs, ligaments, nerves, spinal cord, coccyx, latissimus dorsi, multifidus and quadratus lumborum are not included.'}},
 {id:'torso',coverageNote:{he:'כיסוי חלקי: שלושה שרירי חזה והאלכסוני החיצוני זמינים. הישר הבטני ושכבות הבטן העמוקות חסרים.',en:'Partial coverage: three chest muscles and external oblique are available. Rectus abdominis and deep abdominal layers are missing.'},he:'בית החזה ודופן הבטן בתלת־ממד',en:'3D chest & abdominal wall',regions:['chest','core_abdomen'],src:'/anatomy/torso.glb',maxBytes:6*1024*1024,asset:torso as AtlasAsset,structures:torso.structures as AtlasStructure[],sideNote:{he:'עצם החזה בקו האמצע; מבנים זוגיים מצד ימין',en:'Midline sternum; right-sided paired structures'},availabilityNote:{he:'כיסוי חלקי: שלושה שרירי חזה והאלכסוני החיצוני של הבטן, 12 צלעות, עצם החזה, עצמות להקשר וסחוסי צלעות 1–7. הישר הבטני, האלכסוני הפנימי והרוחבי הבטני אינם כלולים. גם השרירים הבין־צלעיים, הסרעפת ואיברים פנימיים אינם כלולים.',en:'Partial coverage: three chest muscles and abdominal external oblique, 12 ribs, sternum, attachment-context bones and costal cartilages 1–7. Rectus abdominis, internal oblique and transversus abdominis are unavailable. Intercostal muscles, diaphragm and internal organs are not included.'}},
 {id:'neck',he:'צוואר ועמוד השדרה הצווארי בתלת־ממד',en:'3D neck & cervical spine',regions:['cervical_neck'],src:'/anatomy/neck.glb',maxBytes:3*1024*1024,asset:neck as AtlasAsset,structures:neck.structures as AtlasStructure[],initialFocus:{structure:'cervical-4',scale:3},sideNote:{he:'עצמות בקו האמצע ומבנים מצד ימין',en:'Midline bones and right-sided structures'},coverageNote:{he:'השריר Longus colli מימין, דיסקים, רצועות ועצבים אינם כלולים. הגולגולת מוצגת באופן חלקי להקשר.',en:'Right longus colli, discs, ligaments and nerves are not included. Skull coverage is partial and provides attachment context.'},availabilityNote:{he:'חוליות C1–C7, חוליות T1–T6 להקשר, עצם העורף, עצם הרקה מימין ועצמות לחיבורי השרירים. שלושת הסקאלנים נבחרים כקבוצה; ארבעה שרירים תת־עורפיים ניתנים לבחירה בנפרד. אין חוט שדרה, כלי דם, עצבים, דיסקים או גאומטריה נפרדת של מפרקים.',en:'C1–C7 with T1–T6 context, occipital bone, right temporal bone and muscle-attachment bones. Three scalenes are selected as a group; four suboccipital muscles are individually selectable. Spinal cord, vessels, nerves, discs and separate joint geometry are unavailable.'}},
 {id:'thigh',initialFocus:{structure:'adductor-magnus',scale:1.5},he:'ירך ומפשעה בתלת־ממד',en:'3D thigh & groin',regions:['thigh','groin'],src:'/anatomy/thigh.glb',maxBytes:3*1024*1024,asset:thigh as AtlasAsset,structures:thigh.structures as AtlasStructure[],availabilityNote:{he:'חמש עצמות ו־14 שרירים מצד ימין. עצמות השוק מוצגות במלואן להקשר חיבורי השרירים. המקרב הגדול נבחר כמבנה יחיד; חלקיו אינם ניתנים לבחירה בנפרד. האיליופסואס והסותם החיצוני זמינים במודל האגן. אין רצועות, עצבים, סחוס או גידים נפרדים.',en:'Five right bones and 14 muscles. Full tibia/fibula provide muscle-attachment context. Adductor magnus is selected as one structure; its portions are not individually selectable. Iliopsoas components and obturator externus are available in the hip model. Ligaments, nerves, cartilage and separate tendons are unavailable.'}},
 {id:'skeleton',he:'שלד הגוף המלא בתלת־ממד',en:'3D whole-body skeleton',regions:[],src:'/anatomy/skeleton.glb',maxBytes:12*1024*1024,asset:skeleton as AtlasAsset,structures:skeleton.structures as AtlasStructure[],sideNote:{he:'שלד משני הצדדים ובקו האמצע',en:'Bilateral and midline skeleton'},coverageNote:{he:'שלד ייחוס רציף במיקום המקורי, עם 201 מבנים לבחירה. עצם הזנב ועצמות השמע אינן כלולות; הסקירה הקלינית ממתינה.',en:'Continuous reference skeleton in original alignment, with 201 selectable structures. Coccyx and auditory ossicles are not included; clinical review is pending.'},availabilityNote:{he:'גולגולת, עמוד שדרה ועצה, צלעות ועצם החזה, אגן ועצמות הגפיים בשני הצדדים. עצם הזנב, עצמות השמע, שיניים, דיסקים, סחוסי מפרקים וצלעות, רצועות ושרירים אינם כלולים. העצמות אינן מרותכות; מרווחים ביניהן אינם מודל של רקמות המפרק.',en:'Skull, spine and sacrum, ribs and sternum, pelvis and limb bones on both sides. Coccyx, auditory ossicles, teeth, discs, joint/costal cartilage, ligaments and muscles are not included. Bones are not welded; gaps between them do not model joint tissues.'}},
 {id:'musculoskeletal',he:'שלד ושרירי הגוף בתלת־ממד',en:'3D whole-body bones and muscles',regions:[],src:'/anatomy/musculoskeletal.glb',maxBytes:32*1024*1024,asset:musculoskeletal as AtlasAsset,structures:musculoskeletal.structures as AtlasStructure[],sideNote:{he:'עצמות ושרירים משני הצדדים',en:'Bilateral bones and muscles'},coverageNote:{he:'כיסוי שרירים חלקי: 89 קבוצות בכל צד, מעל 201 מבני השלד. ניתן להסתיר כל שכבה וכל מבנה בנפרד. הסקירה הקלינית ממתינה.',en:'Partial muscle coverage: 89 groups per side over 201 skeleton structures. Toggle each layer or hide individual structures. Clinical review is pending.'},availabilityNote:{he:'178 מבני שרירים בשני הצדדים, בהתאמה לקבוצות שבמודלים האזוריים. הרחב הגבי, הישר הבטני, האלכסוני הפנימי, הרוחבי הבטני, מולטיפידוס, המרובע המותני ושרירים שאינם ברשימה חסרים. גם עצם הזנב, עצמות השמע, דיסקים, סחוסי מפרקים, רצועות, עצבים וכלי דם חסרים. ראשי שרירים וסקאלנים נשמרים בקבוצות הקיימות; הטרפז העליון כלול בטרפז המלא ואינו מופיע שוב.',en:'178 bilateral muscle structures matching the existing regional groups. Latissimus dorsi, rectus abdominis, internal oblique, transversus abdominis, multifidus, quadratus lumborum and unlisted muscles are missing. Coccyx, auditory ossicles, discs, joint cartilage, ligaments, nerves and vessels remain absent. Existing muscle-head/scalene groupings are retained; upper trapezius is included in the full trapezius without duplication.'}},
];
export const modelForRegion=(region:string)=>anatomyModels.find(m=>m.regions.includes(region));
/** Never send a left skeleton bone to a right-only regional asset. */
export function detailModelForStructure(structure:AtlasStructure):AnatomyModel|undefined{
 const model=structure.regionId?modelForRegion(structure.regionId):undefined;
 return model?.structures.some(s=>s.layer===structure.layer&&s.side===structure.side&&s.sources.some(p=>structure.sources.some(source=>source.elementId===p.elementId)))?model:undefined;
}
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
export function visibleStructureIds(model:AnatomyModel,layers:ReadonlySet<AtlasLayer>,isolated:string|null,hidden:ReadonlySet<string>=new Set()){
 return model.structures.filter(s=>layers.has(s.layer)&&!hidden.has(s.id)&&(!isolated||s.id===isolated)).map(s=>s.id);
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

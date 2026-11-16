import {readFileSync} from 'node:fs';
const load=name=>JSON.parse(readFileSync(new URL('../../lib/prepared/'+name,import.meta.url),'utf8'));
const regionAreas={shoulder:'shoulder',elbow:'arm',forearm:'forearm',wrist_hand:'hand',hip_glute:'pelvis',groin:'pelvis',thigh:'thigh',knee:'knee',lower_leg:'lowerleg',ankle_foot:'foot',lower_back_spine:'back',upper_back_scapula:'back',cervical_neck:'neck',chest:'chest',core_abdomen:'abdomen'};
export const detailedAreas=[['head','ראש ופנים','Head & face'],['neck','צוואר','Neck'],['shoulder','כתפיים','Shoulders'],['chest','חזה','Chest'],['back','גב ועמוד שדרה','Back & spine'],['abdomen','בטן','Abdomen'],['pelvis','אגן וישבן','Pelvis & glutes'],['arm','זרוע','Upper arm'],['forearm','אמה','Forearm'],['hand','כף יד','Hand'],['thigh','ירך','Thigh'],['knee','ברך','Knee'],['lowerleg','שוק','Lower leg'],['foot','כף רגל','Foot']].map(([id,he,en])=>({id,he,en}));
const clean=name=>name.toLowerCase().replace(/\b(left|right)\b/g,'').replace(/\s+/g,' ').trim();
const bases=new Map();
for(const s of load('musculoskeletal-model.json').structures){const area=regionAreas[s.regionId];if(area)bases.set(clean(s.en),{he:s.he.replace(/ — (ימין|שמאל)$/,'').replace(/\([^)]*[A-Za-z][^)]*\)/g,'').trim(),area});}
const cards=load('anatomy-learning.json'),names=load('muscles.json');
for(const card of cards){const n=names.find(m=>m.slug===card.slug);const area=regionAreas[card.region];if(n&&area)bases.set(n.name_en.toLowerCase(),{he:n.name_he.replace(/\([^)]*[A-Za-z][^)]*\)/g,'').trim(),area});}
const add=(area,entries)=>{for(const [en,he]of Object.entries(entries))bases.set(en,{he,area});};
add('head',{
 'inferior nasal concha':'קונכיית האף התחתונה','lacrimal bone':'עצם הדמע','maxilla':'הלסת העליונה','nasal bone':'עצם האף','palatine bone':'עצם החך','parietal bone':'עצם הקודקוד','temporal bone':'עצם הרקה','zygomatic bone':'עצם הלחי','atlas':'חוליית האטלס','axis':'חוליית הציר','external ear':'האוזן החיצונית','ethmoid':'עצם הכברה','frontal bone':'עצם המצח','occipital bone':'עצם העורף','sphenoid bone':'עצם היתד','vomer':'עצם המחרשה','mandible':'הלסת התחתונה','cornea':'הקרנית','sclera':'לובן העין','septal nasal cartilage':'סחוס מחיצת האף','major alar cartilage':'סחוס הכנף הגדול של האף','lateral nasal cartilage':'סחוס האף הצידי',
 'masseter':'שריר המלעס','lateral pterygoid':'השריר הכנפי הצידי','medial pterygoid':'השריר הכנפי התיכון','temporalis':'שריר הרקה','frontalis':'שריר המצח','corrugator supercilii':'שריר מקמט הגבה','depressor anguli oris':'שריר מוריד זווית הפה','depressor labii inferioris':'שריר מוריד השפה התחתונה','levator labii superioris':'שריר מרים השפה העליונה','mentalis':'שריר הסנטר','nasalis':'שריר האף','orbicularis oris':'השריר הטבעתי של הפה','orbicularis oculi':'השריר הטבעתי של העין','procerus':'שריר הפירמידה של האף','risorius':'שריר הצחוק','zygomaticus major':'שריר העול הגדול','zygomaticus minor':'שריר העול הקטן'
});
add('neck',{'atlas':'חוליית האטלס','axis':'חוליית הציר','scalenus anterior':'השריר הסקלני הקדמי','scalenus medius':'השריר הסקלני האמצעי','scalenus posterior':'השריר הסקלני האחורי','omohyoid':'השריר השכמתי־לשוני','sternohyoid':'השריר החזי־לשוני','sternothyroid':'השריר החזי־תריסי','thyrohyoid':'השריר התריסי־לשוני','longissimus capitis':'השריר הארוך של הראש','longissimus cervicis':'השריר הארוך של הצוואר','iliocostalis cervicis':'השריר הכסלי־צלעי הצווארי','semispinalis cervicis':'השריר החצי־קוצי הצווארי','multifidus cervicis':'מולטיפידוס צווארי'});
add('chest',{'body of sternum':'גוף עצם החזה','manubrium':'ידית עצם החזה','xiphoid process':'זיז החרב','external intercostal muscle':'השריר הבין־צלעי החיצוני','subclavius':'השריר התת־בריחי','pectoralis major':'שריר החזה הגדול','pectoralis minor':'שריר החזה הקטן'});
add('back',{'trapezius':'שריר הטרפז','multifidus thoracis':'מולטיפידוס חזי','multifidus lumborum':'מולטיפידוס מותני','rotatores':'השרירים המסובבים של עמוד השדרה','serratus posterior inferior':'השריר המסור האחורי התחתון','serratus posterior superior':'השריר המסור האחורי העליון','posterior layer of thoracolumbar fascia':'השכבה האחורית של החיתולית החזית־מותנית','latissimus dorsi':'השריר הרחב הגבי','quadratus lumborum':'השריר המרובע המותני'});
add('abdomen',{'rectus abdominis':'השריר הישר הבטני','internal oblique':'השריר האלכסוני הפנימי של הבטן','external oblique':'השריר האלכסוני החיצוני של הבטן','transversus abdominis':'השריר הרוחבי של הבטן','linea alba':'הקו הלבן של הבטן'});
add('pelvis',{'sacrum':'עצם העצה','hip bone':'עצם האגן','adductor minimus':'המקרב הקטן ביותר','gemellus inferior':'השריר התאום התחתון','gemellus superior':'השריר התאום העליון','iliotibial tract':'הפס הכסלי־שוקתי'});
add('shoulder',{'deltoid':'שריר הדלתואיד','infraspinatus muscle':'השריר התת־קוצי','clavicle':'עצם הבריח','scapula':'עצם השכמה'});
add('arm',{'humerus':'עצם הזרוע','biceps brachii':'השריר הדו־ראשי של הזרוע','triceps brachii':'השריר התלת־ראשי של הזרוע','anconeus':'שריר המרפק'});
add('forearm',{'ulna':'עצם הגומד','radius':'עצם החישור','flexor carpi ulnaris':'כופף שורש כף היד הגומדי','pronator teres':'השריר הכפן העגול'});
add('hand',{'flexor pollicis brevis':'כופף האגודל הקצר','adductor pollicis':'מקרב האגודל','flexor retinaculum of wrist':'רטינקולום הכופפים בשורש כף היד','set of dorsal interossei of hand':'קבוצת השרירים הבין־גרמיים הגביים בכף היד','set of palmar interossei of hand':'קבוצת השרירים הבין־גרמיים הכפיים בכף היד','set of lumbricals of hand':'קבוצת השרירים התולעיים בכף היד'});
add('thigh',{'femur':'עצם הירך','biceps femoris':'השריר הדו־ראשי של הירך'});
add('knee',{'patella':'הפיקה'});
add('lowerleg',{'tibia':'עצם השוקה','fibula':'עצם השוקית','gastrocnemius':'שריר התאומים','calcaneal tendon':'גיד אכילס'});
add('foot',{'navicular bone of foot':'עצם הסירה בכף הרגל','adductor hallucis':'מקרב הבוהן','flexor hallucis brevis':'כופף הבוהן הקצר'});
const ordinals={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
const fingers={'index finger':'האצבע המורה בכף היד','middle finger':'האצבע האמצעית בכף היד','ring finger':'הקמיצה בכף היד','little finger':'הזרת בכף היד',thumb:'האגודל','big toe':'הבוהן בכף הרגל','second toe':'האצבע השנייה בכף הרגל','third toe':'האצבע השלישית בכף הרגל','fourth toe':'האצבע הרביעית בכף הרגל','little toe':'הזרת בכף הרגל'};
function baseLabel(key){
 let m;
 if((m=key.match(/^(distal|middle|proximal) phalanx of (.+)$/))&&fingers[m[2]])return {he:`הגליל ${{distal:'המרוחק',middle:'האמצעי',proximal:'המקורב'}[m[1]]} של ${fingers[m[2]]}`,area:/finger|thumb/.test(m[2])?'hand':'foot'};
 if((m=key.match(/^(\w+) (cervical|thoracic|lumbar) vertebra$/))&&ordinals[m[1]])return {he:`חוליה ${{cervical:'צווארית',thoracic:'חזית',lumbar:'מותנית'}[m[2]]} ${ordinals[m[1]]}`,area:m[2]==='cervical'?'neck':'back'};
 if(key.startsWith('intervertebral disk of ')){const r=baseLabel(key.slice('intervertebral disk of '.length));return {he:`דיסק בין־חולייתי של ${r.he}`,area:r.area};}
 if((m=key.match(/^(\w+) (rib|costal cartilage|metacarpal bone|metatarsal bone)$/))&&ordinals[m[1]])return {he:`${{'rib':'צלע','costal cartilage':'סחוס צלע','metacarpal bone':'עצם מסרק כף היד','metatarsal bone':'עצם מסרק כף הרגל'}[m[2]]} ${ordinals[m[1]]}`,area:/metacarpal/.test(m[2])?'hand':/metatarsal/.test(m[2])?'foot':'chest'};
 if((m=key.match(/^(upper|lower) (central|lateral) secondary incisor tooth$/)))return {he:`שן חותכת קבועה ${m[2]==='central'?'מרכזית':'צידית'} בלסת ${m[1]==='upper'?'העליונה':'התחתונה'}`,area:'head'};
 if((m=key.match(/^(upper|lower) (first|second) secondary (premolar|molar) tooth$/)))return {he:`${m[3]==='premolar'?'קדם־טוחנת':'טוחנת'} קבועה ${ordinals[m[2]]} בלסת ${m[1]==='upper'?'העליונה':'התחתונה'}`,area:'head'};
 if((m=key.match(/^(upper|lower) secondary canine tooth$/)))return {he:`ניב קבוע בלסת ${m[1]==='upper'?'העליונה':'התחתונה'}`,area:'head'};
 if((m=key.match(/^(long|short|lateral|medial|humeral|ulnar|oblique|transverse|superior|inferior) head of (.+)$/))){const r=baseLabel(m[2]);return {he:`הראש ${{long:'הארוך',short:'הקצר',lateral:'הצידי',medial:'התיכון',humeral:'הזרועי',ulnar:'הגומדי',oblique:'האלכסוני',transverse:'הרוחבי',superior:'העליון',inferior:'התחתון'}[m[1]]} של ${r.he}`,area:r.area};}
 if((m=key.match(/^(abdominal|acromial|ascending|clavicular|descending|spinal|sternocostal|transverse|deep|superficial|orbital|palpebral) part of (.+)$/))){const r=baseLabel(m[2]);return {he:`החלק ${{abdominal:'הבטני',acromial:'האקרומיאלי',ascending:'העולה',clavicular:'הבריחי',descending:'היורד',spinal:'הקוצי־שכמתי',sternocostal:'החזי־צלעי',transverse:'הרוחבי',deep:'העמוק',superficial:'השטחי',orbital:'הארובתי',palpebral:'העפעפי'}[m[1]]} של ${r.he}`,area:r.area};}
 if((m=key.match(/^(first|second|third|fourth) (lumbrical|plantar interosseous) of foot$/)))return {he:`${m[2]==='lumbrical'?'השריר התולעי':'השריר הבין־גרמי הסולייתי'} ${ordinals[m[1]]} בכף הרגל`,area:'foot'};
 if((m=key.match(/^(abductor|flexor|opponens) digiti minimi( brevis)? of (hand|foot)$/)))return {he:`${{abductor:'מרחיק',flexor:'כופף',opponens:'מנגד'}[m[1]]} הזרת${m[2]?' הקצר':''} בכף ${m[3]==='hand'?'היד':'הרגל'}`,area:m[3]};
 if(bases.has(key))return bases.get(key);
 throw Error('Unknown detailed anatomical name: '+key);
}
export function detailedName(name){
 const side=/\bleft\b/i.test(name)?'שמאל':/\bright\b/i.test(name)?'ימין':null;
 const duplicate=/ \(2\)$/.test(name),key=clean(name).replace(/ \(2\)$/,'');const r=baseLabel(key);
 return {...r,he:r.he+(duplicate?' (חלק נוסף במודל)':'')+(side?' — '+side:'')};
}
/** Explicit source subdivision → whole-muscle educational context, never head-specific activation. */
export function wholeMuscleContext(name){
 const key=clean(name).replace(/ \(2\)$/,'');
 const explicit={
 'acromial part of deltoid':'deltoid','clavicular part of deltoid':'deltoid','spinal part of deltoid':'deltoid',
 'abdominal part of pectoralis major':'pectoralis-major','clavicular part of pectoralis major':'pectoralis-major','sternocostal part of pectoralis major':'pectoralis-major',
 'ascending part of trapezius':'trapezius','descending part of trapezius':'trapezius','transverse part of trapezius':'trapezius',
 'long head of biceps brachii':'biceps-brachii','short head of biceps brachii':'biceps-brachii',
 'long head of triceps brachii':'triceps-brachii','lateral head of triceps brachii':'triceps-brachii','medial head of triceps brachii':'triceps-brachii',
 'lateral head of gastrocnemius':'gastrocnemius','medial head of gastrocnemius':'gastrocnemius',
 'oblique head of adductor pollicis':'adductor-pollicis','transverse head of adductor pollicis':'adductor-pollicis','lateral head of flexor hallucis brevis':'flexor-hallucis-brevis','medial head of flexor hallucis brevis':'flexor-hallucis-brevis','humeral head of flexor carpi ulnaris':'flexor-carpi-ulnaris','ulnar head of flexor carpi ulnaris':'flexor-carpi-ulnaris',
 'humeral head of pronator teres':'pronator-teres','ulnar head of pronator teres':'pronator-teres',
 'infraspinatus muscle':'infraspinatus','extensor carpi ulnaris':'extensor-carpi-ulnaris','flexor digitorum superficialis':'flexor-digitorum-superficialis'
 };
 return cards.some(c=>c.slug===explicit[key])?explicit[key]:undefined;
}

export function exactDetailedLearning(name){return ({'long head of biceps femoris':'biceps-femoris-long-head','short head of biceps femoris':'biceps-femoris-short-head'})[clean(name)];}

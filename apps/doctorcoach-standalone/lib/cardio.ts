export const cardioActivityIds=['walking','outdoor_running','treadmill_running','cycling','stationary_bike','elliptical','skierg','outdoor_skiing','rowing_machine','swimming','stair_climber','incline_walking','hiit','jump_rope','other_cardio','hiking','sprints'] as const;
export type CardioActivityId=typeof cardioActivityIds[number];
export type CardioMetrics={durationSeconds?:number;distanceMeters?:number;paceSeconds?:number;speedKph?:number;inclinePercent?:number;resistance?:number;resistanceLabel?:string;cadence?:number;heartRate?:number;maxHeartRate?:number;heartRateZone?:number;rpe?:number;poolLengthMeters?:number;lengths?:number;calories?:number};
export type CardioMetricSource='manual'|'device_reported'|'calculated'|'estimated'|'timer';
export type CardioMetricSources=Partial<Record<keyof CardioMetrics,CardioMetricSource>>;
export type CardioInterval={id:string;phase:'warmup'|'work'|'recovery'|'cooldown';durationSeconds:number;repeat?:number;targets?:CardioMetrics};
export type CardioPrescription={activityId:CardioActivityId;mode:'steady'|'intervals';targets:CardioMetrics;intervals?:CardioInterval[];rounds?:number;customLabel?:string};
const common=['durationSeconds','heartRate','maxHeartRate','heartRateZone','rpe','calories'];
const labels:Record<CardioActivityId,[string,string,string[]]>={
 walking:['הליכה','Walking',['הליכה רגלית','Walk']],outdoor_running:['ריצה בחוץ','Outdoor running',['ריצה','Running','Outdoor run']],treadmill_running:['ריצה בהליכון','Treadmill running',['ריצה על הליכון','Treadmill run']],
 cycling:['רכיבה על אופניים','Cycling',['רכיבה','אופניים','Biking','Bicycle ride']],stationary_bike:['אופני כושר','Stationary bike',['אופניים נייחים','Exercise bike','Indoor cycling']],elliptical:['אליפטיקל','Elliptical',['קרוס טריינר','Cross trainer','Elliptical trainer']],
 skierg:['סקי ארג','SkiErg',['Ski Erg','סקי ארגומטר','Ski ergometer']],outdoor_skiing:['סקי בחוץ','Outdoor skiing',['סקי','Skiing']],rowing_machine:['חתירה במכשיר','Rowing machine',['חתירה','חתירה במכונה','Rowing','Row ergometer']],
 swimming:['שחייה','Swimming',['שחיה','Swim','Pool swimming']],stair_climber:['מדרגות','Stair climber',['מכשיר מדרגות','Stair climbing','Stairmaster']],incline_walking:['הליכה בשיפוע','Incline walking',['הליכה בעלייה','הליכה בהליכון בשיפוע','Incline treadmill walk']],
 hiit:['אינטרוולים בעצימות גבוהה','HIIT',['היט','High intensity interval training']],jump_rope:['קפיצה בחבל','Jump rope',['דילוג בחבל','Skipping rope','Rope skipping']],other_cardio:['אירובי מותאם אישית','Custom cardio',['אירובי אחר','Other cardio','פעילות אירובית מותאמת אישית']],
 hiking:['טיול רגלי','Hiking',['הייקינג','הייקינג בשטח','טיול הליכה','Trekking','Hike']],sprints:['ספרינטים','Sprints',['ספרינט','ריצות קצרות','Sprint','Sprint running']],
};
const distanceIds=['walking','outdoor_running','treadmill_running','cycling','stationary_bike','elliptical','outdoor_skiing','incline_walking','rowing_machine','skierg','swimming','hiking','sprints','other_cardio'];
export const cardioActivities=cardioActivityIds.map(id=>({id,name:labels[id][0],nameEn:labels[id][1],aliases:labels[id][2],paceUnit:['rowing_machine','skierg'].includes(id)?'seconds/500m':id==='swimming'?'seconds/100m':'seconds/km',metrics:[...common,...(distanceIds.includes(id)?['distanceMeters','paceSeconds','speedKph']:[]),...(['treadmill_running','incline_walking'].includes(id)?['inclinePercent']:[]),...(['stationary_bike','elliptical','rowing_machine','skierg','stair_climber'].includes(id)?['resistance','resistanceLabel','cadence']:[]),...(id==='swimming'?['poolLengthMeters','lengths']:[]),...(id==='jump_rope'?['cadence']:[])]}));
export const cardioActivity=(id:string)=>cardioActivities.find(a=>a.id===id);
const nameKey=(name:string)=>name.normalize('NFKC').toLowerCase().replace(/[‐‑–—_\-]/g,' ').replace(/\s+/g,' ').trim();
export function resolveCardioActivityName(name:string){const ids=cardioActivities.filter(a=>[a.id,a.name,a.nameEn,...a.aliases].some(n=>nameKey(n)===nameKey(name))).map(a=>a.id);return ids.length===1?ids[0]:'';}
export const isCardioExerciseId=(id:string)=>id.startsWith('cardio:')&&!!cardioActivity(id.slice(7));
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function fail():never{throw Object.assign(new Error('נתוני האירובי אינם תקינים.'),{status:400});}
const bounds:Record<string,[number,number]>={durationSeconds:[0.001,86400],distanceMeters:[0.001,1000000],paceSeconds:[0.001,100000],speedKph:[0.001,150],inclinePercent:[0,100],resistance:[0.001,10000],cadence:[0.001,1000],heartRate:[20,250],maxHeartRate:[20,250],heartRateZone:[1,5],rpe:[0,10],poolLengthMeters:[1,150],lengths:[1,10000],calories:[0.001,100000]};
export function parseCardioMetrics(activityId:CardioActivityId,value:unknown):CardioMetrics{
 const activity=cardioActivity(activityId);if(!activity||!record(value))return fail();const result:Record<string,number|string>={};
 for(const [key,v] of Object.entries(value)){
  if(!activity.metrics.includes(key))fail();
  if(key==='resistanceLabel'){if(typeof v!=='string'||!v.trim()||v.length>80)fail();result[key]=v.trim();continue;}
  const b=bounds[key];if(!b||typeof v!=='number'||!Number.isFinite(v)||v<b[0]||v>b[1]||(['lengths','heartRateZone'].includes(key)&&!Number.isInteger(v)))fail();result[key]=v;
 }
 if(result.resistance!==undefined&&!result.resistanceLabel)fail();
 if(result.lengths!==undefined){if(result.poolLengthMeters===undefined)fail();const distance=Number(result.lengths)*Number(result.poolLengthMeters);if(result.distanceMeters!==undefined&&result.distanceMeters!==distance)fail();result.distanceMeters=distance;}
 if(typeof result.heartRate==='number'&&typeof result.maxHeartRate==='number'&&result.maxHeartRate<result.heartRate)fail();return result;
}
export function parseCardioPrescription(value:unknown):CardioPrescription{
 if(!record(value)||typeof value.activityId!=='string'||!cardioActivity(value.activityId)||!['steady','intervals'].includes(String(value.mode)))fail();
 const activityId=value.activityId as CardioActivityId,targets=parseCardioMetrics(activityId,value.targets??{});
 let customLabel:string|undefined;if(value.customLabel!==undefined){if(activityId!=='other_cardio'||typeof value.customLabel!=='string'||value.customLabel.trim().length<2||value.customLabel.length>80)fail();customLabel=value.customLabel.trim();}
 const custom=customLabel?{customLabel}:{};
 if(value.mode==='steady'){if(value.intervals!==undefined||value.rounds!==undefined||(!targets.durationSeconds&&!targets.distanceMeters))fail();return {activityId,mode:'steady',targets,...custom};}
 if(!Array.isArray(value.intervals)||!value.intervals.length||value.intervals.length>100)fail();
 const rounds=value.rounds??1;if(typeof rounds!=='number'||!Number.isInteger(rounds)||rounds<1||rounds>100)fail();
 let total=0,duration=0;const ids=new Set<string>();
 const intervals=value.intervals.map(v=>{if(!record(v)||typeof v.id!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(v.id)||ids.has(v.id)||!['warmup','work','recovery','cooldown'].includes(String(v.phase))||typeof v.durationSeconds!=='number'||!Number.isFinite(v.durationSeconds)||v.durationSeconds<=0||v.durationSeconds>86400)fail();ids.add(v.id);const repeat=v.repeat??1;if(typeof repeat!=='number'||!Number.isInteger(repeat)||repeat<1||repeat>100)fail();total+=repeat;duration+=repeat*v.durationSeconds;return {id:v.id,phase:v.phase as CardioInterval['phase'],durationSeconds:v.durationSeconds,repeat,targets:parseCardioMetrics(activityId,v.targets??{})};});
 if(total*rounds>200||duration*rounds>86400)fail();return {activityId,mode:'intervals',targets,intervals,...(value.rounds===undefined?{}:{rounds}),...custom};
}
export function cardioPrescribedSeconds(p:CardioPrescription){return p.mode==='intervals'?(p.rounds??1)*(p.intervals??[]).reduce((n,i)=>n+i.durationSeconds*(i.repeat??1),0):p.targets.durationSeconds;}
export function performedCardioSeconds(result:{elapsedSeconds:number;metrics:CardioMetrics}){return result.metrics.durationSeconds??result.elapsedSeconds;}
/** Sources describe reported provenance, not hardware attestation. No calories or heart-rate zone are invented. */
export function completeCardioMetrics(id:CardioActivityId,value:unknown,sourcesValue:unknown,elapsed:number,complete=false){
 if(!record(value)||sourcesValue!==undefined&&!record(sourcesValue))fail();const raw={...value},sources:CardioMetricSources={};
 for(const [key,source] of Object.entries(sourcesValue??{})){
  if(!(key in raw)||!['manual','device_reported','calculated','estimated','timer'].includes(String(source)))fail();
  if(source==='timer'&&key!=='durationSeconds'||source==='calculated'&&!['distanceMeters','paceSeconds','speedKph'].includes(key)||source==='estimated'&&key!=='calories')fail();
  sources[key as keyof CardioMetrics]=source as CardioMetricSource;
  if(source==='calculated')delete raw[key];
 }
 const metrics=parseCardioMetrics(id,raw);for(const key of Object.keys(metrics) as (keyof CardioMetrics)[])sources[key]??='manual';
 if(metrics.lengths!==undefined&&metrics.poolLengthMeters!==undefined)sources.distanceMeters='calculated';
 if(complete&&metrics.durationSeconds===undefined&&elapsed>0){metrics.durationSeconds=elapsed;sources.durationSeconds='timer';}
 if(complete&&metrics.durationSeconds&&metrics.distanceMeters){
  const activity=cardioActivity(id)!,scale=activity.paceUnit==='seconds/500m'?500:activity.paceUnit==='seconds/100m'?100:1000;
  if(activity.metrics.includes('paceSeconds')&&metrics.paceSeconds===undefined){const pace=Math.round(metrics.durationSeconds/metrics.distanceMeters*scale*1000)/1000;if(pace>=bounds.paceSeconds[0]&&pace<=bounds.paceSeconds[1]){metrics.paceSeconds=pace;sources.paceSeconds='calculated';}}
  if(activity.metrics.includes('speedKph')&&metrics.speedKph===undefined){const speed=Math.round(metrics.distanceMeters/metrics.durationSeconds*3.6*1000)/1000;if(speed>=bounds.speedKph[0]&&speed<=bounds.speedKph[1]){metrics.speedKph=speed;sources.speedKph='calculated';}}
 }
 // Revalidate derived quantities against the same bounds as reported values.
 return {metrics:parseCardioMetrics(id,metrics),metricSources:Object.fromEntries(Object.entries(sources).filter(([key])=>key in metrics)) as CardioMetricSources};
}

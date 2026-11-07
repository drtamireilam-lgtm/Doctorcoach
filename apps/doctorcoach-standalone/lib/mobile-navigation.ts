export function isSimpleTrainee(input:{auth:string;staffAccess:string;staffRole?:string|null;canAdmin?:boolean;completed?:boolean}){
 return input.auth==='ready'&&input.staffAccess==='member'&&!input.staffRole&&!input.canAdmin&&input.completed===true;
}
export const traineeAreas=[
 {id:'home',label:'בית'},{id:'care',label:'התיק שלי'},{id:'plan',label:'התוכנית שלי'},
 {id:'history',label:'התקדמות'},{id:'library',label:'ספריית תרגילים'},
 {id:'learn',label:'אנטומיה ולמידה'},{id:'contact',label:'יצירת קשר'},
] as const;
export type TraineeArea=typeof traineeAreas[number]['id']|'more';
export const traineePrimaryNav=[{id:'home',label:'בית'},{id:'plan',label:'אימונים'},{id:'history',label:'התקדמות'},{id:'learn',label:'אנטומיה'},{id:'more',label:'עוד'}] as const;
// Hide staff shortcuts while authorization is refreshing or unavailable.
export function staffDestinations(input:{access:string;careRole?:string|null}){
 if(!['member','staff'].includes(input.access))return [];
 return ['admin','team','dashboard'].filter(id=>id==='admin'?input.access==='staff':id==='team'?!!input.careRole&&input.careRole!=='coordinator':!!input.careRole||input.access==='staff');
}
const parents:Record<string,TraineeArea>={
 home:'home',stories:'home',pro:'home',more:'more',
 care:'care',onboarding:'care',settings:'more',membership:'more',privacy:'more',injuries:'care',
 plan:'plan',workout:'plan',readiness:'plan',history:'history',nutrition:'history',recovery:'history',
 library:'library',videos:'library',learn:'learn',
 contact:'contact',messages:'contact',feedback:'contact',appointments:'contact',consult:'contact',
};
export function areaFor(section:string):TraineeArea|undefined{return parents[section];}
export function isAccountSection(section:string){return ['settings','membership','privacy'].includes(section);}
export function mobileTabFor(section:string){const area=areaFor(section);if(isAccountSection(section)||!area)return undefined;return ['home','plan','history','learn'].includes(area)?area:'menu';}
export const areaLinks:Partial<Record<TraineeArea,{id:string;label:string}[]>>={
 home:[{id:'home',label:'בית'},{id:'pro',label:'הצוות'},{id:'stories',label:'סיפורי התקדמות'}],
 care:[{id:'care',label:'התיק שלי'},{id:'onboarding',label:'שאלונים והערכה'},{id:'injuries',label:'פציעות והתאמות'},{id:'history',label:'התקדמות'}],
 plan:[{id:'plan',label:'התוכנית שלי'},{id:'readiness',label:'מוכנות לפני האימון'}],
 history:[{id:'nutrition',label:'תזונה ומדידות'},{id:'recovery',label:'כאב וטווח תנועה'}],
 library:[{id:'library',label:'תרגילים'},{id:'videos',label:'סרטוני הדרכה'}],
 contact:[{id:'contact',label:'יצירת קשר'},{id:'messages',label:'הודעות לצוות'},{id:'appointments',label:'התורים שלי'},{id:'feedback',label:'משוב והצעות'},{id:'consult',label:'ייעוץ ותיאום'}],
};

import type {CareClient} from './care.ts';
const tabs=new Set(['summary','programs','checkins','videos','nutrition','recovery','progress','assignments','documents','messages']);
export function staffClientHref(client:string,tab='summary'){return '#team?'+new URLSearchParams({client,tab:tabs.has(tab)?tab:'summary'});}
export function staffClientTarget(hash:string){
 const [route,query]=hash.split('?');if(route!=='#team')return {client:null,tab:'summary'};
 const params=new URLSearchParams(query),client=params.get('client'),tab=params.get('tab')??'summary';
 return {client:client&&client.length<=200?client:null,tab:tabs.has(tab)?tab:'summary'};
}
export function visibleStaffClients(clients:CareClient[],query:string,pendingOnly=false){
 const search=query.trim().toLocaleLowerCase();
 return clients.filter(c=>(c.name+' '+c.goal).toLocaleLowerCase().includes(search)&&(!pendingOnly||c.pendingCheckins>0||c.pendingVideos>0)).sort((a,b)=>(b.pendingCheckins+b.pendingVideos)-(a.pendingCheckins+a.pendingVideos)||a.name.localeCompare(b.name));
}

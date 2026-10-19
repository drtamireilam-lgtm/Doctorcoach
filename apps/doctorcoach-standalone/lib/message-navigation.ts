import type {Thread} from './messaging.ts';
export type ThreadFilter='all'|'unread'|'open'|'resolved';
export function visibleMessageThreads(threads:Thread[],{clientId,channel='all',filter='all',query=''}:{clientId?:string;channel?:string;filter?:ThreadFilter;query?:string}={}){
 const text=query.trim().toLocaleLowerCase();
 return threads.filter(t=>(!clientId||t.clientId===clientId)&&(t.available||t.latestAt!==null)&&(channel==='all'||channel===t.channel)&&t.name.toLocaleLowerCase().includes(text)&&(filter==='all'||filter==='unread'&&t.unread>0||filter==='open'&&!!t.latestAt&&!t.resolved||filter==='resolved'&&!!t.resolved)).sort((a,b)=>Number(b.unread>0)-Number(a.unread>0)||(b.latestAt??'').localeCompare(a.latestAt??'')||a.name.localeCompare(b.name));
}

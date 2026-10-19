const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const valid=new RegExp('^'+uuid+uuid+'$','i');
export const coachInviteStorageKey='doctorcoach-pending-coach-invite';
export function coachInvitePath(code:string){if(!valid.test(code))throw new Error('Invalid invitation link.');return '/coaching#invite='+encodeURIComponent(code);}
export function coachInviteCode(hash:string){const code=new URLSearchParams(hash.replace(/^#/, '')).get('invite');return code&&valid.test(code)?code:'';}
export function storedCoachInvite(raw:string|null,at=Date.now()){try{const value=JSON.parse(raw??'null');return value&&typeof value.code==='string'&&valid.test(value.code)&&Number.isFinite(value.at)&&value.at<=at&&at-value.at<7*86400000?value.code:'';}catch{return '';}}

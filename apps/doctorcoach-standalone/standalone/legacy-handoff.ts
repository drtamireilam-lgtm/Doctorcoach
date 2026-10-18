// Configuration only; never derive a handoff origin from browser input.
export function legacyHandoffUrl(enabled:boolean,oldOrigin:string|undefined,newOrigin:string){
 if(!enabled)return undefined;
 if(!oldOrigin)throw new Error('Pinned legacy origin required');
 const old=new URL(oldOrigin),target=new URL(newOrigin);
 if(old.protocol!=='https:'||old.origin!==oldOrigin||old.username||old.password||old.origin===target.origin)throw new Error('Distinct pinned HTTPS legacy origin required');
 return old.origin+'/account/migrate';
}

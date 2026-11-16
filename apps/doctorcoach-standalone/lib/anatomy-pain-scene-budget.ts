/** Only opaque component tokens are retained here; never report or account data. */
export function createPainSceneBudget(){
 const leases=new Map<symbol,object>(),listeners=new Set<()=>void>();let active:symbol|null=null;
 const notify=()=>{for(const listener of [...listeners])listener();};
 return {
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  isActive(token:symbol){return active===token;},
  register(token:symbol){const lease={};leases.set(token,lease);active=token;notify();return()=>{if(leases.get(token)!==lease)return;leases.delete(token);if(active===token){active=null;notify();}};},
  activate(token:symbol){if(!leases.has(token)||active===token)return;active=token;notify();},
 };
}
export const painSceneBudget=createPainSceneBudget();

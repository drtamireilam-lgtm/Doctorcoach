/** Only route/dirty metadata is retained here, never unsaved set values. */
export function workoutNavigation(){
 let current='',dirty=false;
 return {
  setDirty(value:boolean){dirty=value;},
  accept(target:string,confirmLeave:()=>boolean){
   if(dirty&&target!==current&&!confirmLeave())return false;
   current=target;return true;
  },
  current(){return current;},
 };
}

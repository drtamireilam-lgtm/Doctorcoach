// Shared by the dialog guard and its regression tests. Server authorization remains mandatory.
export function workoutStartReady(auth:string,canStart:boolean|undefined,exerciseCount:number):boolean {
 return auth==='ready'&&canStart===true&&Number.isInteger(exerciseCount)&&exerciseCount>0;
}

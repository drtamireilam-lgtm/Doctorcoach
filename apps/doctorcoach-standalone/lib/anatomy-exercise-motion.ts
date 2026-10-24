export type MotionMode='motion'|'muscles'|'joints';
export type MuscleRole='primary'|'secondary'|'stabilizer';
export type Point3=readonly [number,number,number];
export type JointMotion={id:string;side:'left'|'right';pivot:Point3;axis:Point3;regions:readonly string[]};
export type ExerciseMotionProfile={exerciseId:string;modelId:string;assetSha256:string;review:'pending';muscleMotion:'neutral-reference-only';maxDegrees:number;secondsPerRep:number;joints:readonly JointMotion[];roles:Readonly<Record<string,MuscleRole>>};
const roles:Record<string,MuscleRole>={};
for(const side of ['left','right'])for(const [id,role] of [['biceps-brachii','primary'],['brachialis','primary'],['brachioradialis','secondary'],['flexor-carpi-radialis','stabilizer'],['flexor-carpi-ulnaris','stabilizer']] as const)roles[side+'-'+id]=role;
const curl:ExerciseMotionProfile={exerciseId:'barbell-curl',modelId:'musculoskeletal',assetSha256:'e2a429905cf3def79b1e730cf49b1d47239ff3b39dbcb77695ef4f6c7886046c',review:'pending',muscleMotion:'neutral-reference-only',maxDegrees:100,secondsPerRep:5,roles:Object.freeze(roles),joints:[
 {id:'right-elbow',side:'right',pivot:[-.216,1.041,.071],axis:[1,-.168,0],regions:['forearm','wrist_hand']},
 {id:'left-elbow',side:'left',pivot:[.216,1.041,.071],axis:[1,.168,0],regions:['forearm','wrist_hand']},
]};
export function motionProfile(exerciseId:string):ExerciseMotionProfile|undefined{return exerciseId===curl.exerciseId?curl:undefined;}
export function boundedDegrees(value:number,max=100):number{return Number.isFinite(value)?Math.max(0,Math.min(max,value)):0;}
export function exercisePoseAngle(seconds:number,profile:ExerciseMotionProfile):number{
 if(!Number.isFinite(seconds)||seconds<=0)return 0;
 return boundedDegrees((1-Math.cos((seconds%profile.secondsPerRep)*2*Math.PI/profile.secondsPerRep))*profile.maxDegrees/2,profile.maxDegrees);
}
/** Source-coordinate Rodrigues rotation; no geometry/attachment deformation. */
export function rotateJointPoint(point:Point3,joint:JointMotion,degrees:number):[number,number,number]{
 const angle=-boundedDegrees(degrees)*Math.PI/180;if(angle===0)return [...point];
 const length=Math.hypot(...joint.axis),[x,y,z]=joint.axis.map(v=>v/length),[a,b,c]=point.map((v,i)=>v-joint.pivot[i]);
 const co=Math.cos(angle),si=Math.sin(angle),dot=x*a+y*b+z*c;
 return [joint.pivot[0]+a*co+(y*c-z*b)*si+x*dot*(1-co),joint.pivot[1]+b*co+(z*a-x*c)*si+y*dot*(1-co),joint.pivot[2]+c*co+(x*b-y*a)*si+z*dot*(1-co)];
}

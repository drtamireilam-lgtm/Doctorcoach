import type {JointMovement} from './anatomy-joint-movements.ts';
export type JointPlayback={phase:number;playing:boolean;speed:number};
export function loopProgress(phase:number){return Number.isFinite(phase)?(1-Math.cos((phase%1)*2*Math.PI))/2:0;}
// Returning movements start at source neutral (the midpoint of their cycle).
export function initialPlayback(m:JointMovement):JointPlayback{return {phase:['elbow-extension','shoulder-adduction','forearm-supination','fingers-extension','hip-adduction','knee-extension'].includes(m.id)?.5:0,playing:false,speed:1};}
export function resetPlayback(state:JointPlayback,m:JointMovement):JointPlayback{return {...initialPlayback(m),speed:state.speed};}
export function togglePlayback(state:JointPlayback):JointPlayback{return {...state,playing:!state.playing};}
export function setPlaybackSpeed(state:JointPlayback,speed:number):JointPlayback{return {...state,speed:[.5,1,2].includes(speed)?speed:1};}
export function advancePlayback(state:JointPlayback,seconds:number,m:JointMovement):JointPlayback{
 if(!state.playing||!Number.isFinite(seconds)||seconds<=0||m.status==='blocked')return state;
 return {...state,phase:(state.phase+seconds*state.speed/m.seconds)%1};
}

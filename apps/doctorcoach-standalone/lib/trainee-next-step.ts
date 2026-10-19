import {consents,CONSENT_REVISION,type OnboardingData} from './intake.ts';
import type {TrainingAccess} from './training-access.ts';
export type TraineeNextStep='profile'|'medical'|'build'|'waiting'|'access'|'start'|'resume'|'ready';
export function traineeNextStep(input:{onboarding:OnboardingData;access:TrainingAccess;planCount:number;active:boolean;completedWorkouts:number}){
 const {onboarding,access}=input;
 const profile=!!onboarding.intake?.completed&&onboarding.consentRevision===CONSENT_REVISION&&consents.every(c=>!c.required||onboarding.consents[c.id]);
 const program=access.canStart&&input.planCount>0;
 const firstWorkout=input.completedWorkouts>0;
 // A medical hold always wins, including when an older session remains open.
 const next:TraineeNextStep=onboarding.trainingBlocked?'medical':!profile?'profile':input.active?'resume':!program?access.canBuild?'build':access.mode==='self'?'access':'waiting':firstWorkout?'ready':'start';
 return {next,profile,program,firstWorkout};
}

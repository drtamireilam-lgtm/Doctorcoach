import type {BillingSeat} from './coach-removals.ts';
export const coachClientRateAgorot=800;
export type CoachRosterMember={clientId:string;name:string|null;email:string|null;state:string;joinedAt:string;onboarded:boolean;consentActive:boolean;eligible:boolean;billingState:string;billingVersion:number;otherCoaches:{email:string;name:string}[]};
export type CoachRosterEvent={sequence:number;workspaceId:string;clientId:string;previousState:string|null;state:string;occurredAt:string;source:string};
export type CoachBillingWorkspace={id:string;name:string;ownerEmail:string;state:string;licenseActive:boolean;members:CoachRosterMember[];billingSeats:BillingSeat[];pendingRemovals:number;activeCount:number;registeredCount:number;billableCount:number;estimatedAgorot:number;pendingInvites:number;overlapCount:number;removedThisMonth:number};
export type CoachBillingReport={manager:boolean;monitor:boolean;month:string;generatedAt:string;collectionAt:string;cutoffAt:string;removalsLocked:boolean;rateAgorot:number;workspaces:CoachBillingWorkspace[];events:CoachRosterEvent[];eventsLimited:boolean;historyStartedAt:string|null};
export const billingMonth=(at=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit'}).format(at);

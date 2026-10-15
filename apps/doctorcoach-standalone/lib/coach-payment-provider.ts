/** Provider adapters are server-only. Never take provider tokens, amounts or receipt states from a browser. */
export type ProviderChargeRequest={idempotencyKey:string;mandateReference:string;amountAgorot:number;currency:'ILS'};
export type ProviderChargeResult={idempotencyKey:string;amountAgorot:number;currency:string;status:'succeeded'|'declined'|'pending';transactionReference:string|null};
export interface CoachPaymentProvider {
 readonly name:string;
 readonly ready:boolean;
 /** Lookup must verify provider records by the same stable key before reconciliation. */
 lookup(idempotencyKey:string):Promise<ProviderChargeResult|null>;
 /** Must have provider-side idempotency for this key, including concurrent calls. */
 collect(request:ProviderChargeRequest):Promise<ProviderChargeResult>;
}
export const unavailableCoachPaymentProvider:CoachPaymentProvider={name:'unconfigured',ready:false,async lookup(){throw new Error('Payment provider is not connected.');},async collect(){throw new Error('Payment provider is not connected.');}};

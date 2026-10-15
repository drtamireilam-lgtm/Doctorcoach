/** Staging-only identity mapping. No route or live authentication imports this module.
 * The caller must supply a server-side verifier that validates signature, audience,
 * session revocation and issuer. JSON, headers and email are never identity proofs.
 */
export type IdentityClaims={issuer:string;subject:string;authenticatedAt:number;expiresAt:number};
export type VerifiedIdentity=Readonly<IdentityClaims>;
export type IdentityVerifier=(token:string)=>Promise<IdentityClaims|null>;
export class IdentityError extends Error {status:number;constructor(message:string,status=403){super(message);this.status=status;}}
const verified=new WeakSet<object>();

export async function verifyIdentity(token:string,verifier:IdentityVerifier,allowedIssuers:readonly string[],now=Date.now()):Promise<VerifiedIdentity>{
  if(typeof token!=='string'||!token||token.length>16000)throw new IdentityError('Identity proof required.',401);
  let claims:IdentityClaims|null;
  try{claims=await verifier(token);}catch{throw new IdentityError('Invalid identity proof.',401);}
  if(!claims||!allowedIssuers.includes(claims.issuer)||typeof claims.subject!=='string'||!claims.subject||claims.subject.length>255||claims.subject!==claims.subject.trim()||
    !Number.isFinite(claims.authenticatedAt)||claims.authenticatedAt<0||!Number.isFinite(claims.expiresAt)||claims.authenticatedAt>now+30000||claims.expiresAt<=now||claims.expiresAt<=claims.authenticatedAt)throw new IdentityError('Invalid identity proof.',401);
  const identity=Object.freeze({issuer:claims.issuer,subject:claims.subject,authenticatedAt:claims.authenticatedAt,expiresAt:claims.expiresAt});
  verified.add(identity);return identity;
}

type Principal={id:string;state:string;origin_issuer:string;origin_subject:string};
type Challenge={id:string;principal_id:string;source_subject:string;target_issuer:string;target_subject:string;expires_at:number;consumed_at:number|null};
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

export function identityMapping(db:D1Database,options:{legacyIssuer:string;externalIssuers:readonly string[];now?:()=>number}){
  const now=options.now??Date.now;
  if(!options.legacyIssuer||!options.externalIssuers.length||options.externalIssuers.includes(options.legacyIssuer))throw new IdentityError('Identity configuration invalid.',500);
  function requireProof(identity:VerifiedIdentity,legacy=false,fresh=false){
    const at=now();
    if(!identity||!verified.has(identity)||identity.expiresAt<=at||identity.authenticatedAt>at+30000||
      (legacy?identity.issuer!==options.legacyIssuer:!options.externalIssuers.includes(identity.issuer))||
      (fresh&&at-identity.authenticatedAt>10*60000))throw new IdentityError('A current authenticated identity is required.',401);
  }
  async function active(id:string){const row=await db.prepare('SELECT id,state,origin_issuer,origin_subject FROM dc_identity_principals WHERE id=?').bind(id).first<Principal>();if(!row||row.state!=='active')throw new IdentityError('Account unavailable.');return row;}
  async function lookup(identity:VerifiedIdentity){return db.prepare('SELECT principal_id FROM dc_identity_aliases WHERE issuer=? AND subject=?').bind(identity.issuer,identity.subject).first<{principal_id:string}>();}
  return {
    async registerLegacy(identity:VerifiedIdentity){
      requireProof(identity,true);const at=now();
      await db.batch([
        db.prepare("INSERT INTO dc_identity_principals(id,state,origin_issuer,origin_subject,created_at) VALUES(?,'active',?,?,?) ON CONFLICT DO NOTHING").bind(identity.subject,identity.issuer,identity.subject,at),
        db.prepare("INSERT INTO dc_identity_aliases(issuer,subject,principal_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM dc_identity_principals WHERE id=? AND state='active' AND origin_issuer=? AND origin_subject=?) ON CONFLICT DO NOTHING").bind(identity.issuer,identity.subject,identity.subject,at,identity.subject,identity.issuer,identity.subject),
      ]);
      const row=await lookup(identity);
      if(!row||row.principal_id!==identity.subject)throw new IdentityError('Legacy identity collision.',409);
      await active(row.principal_id);return {userId:row.principal_id};
    },
    async createAccount(identity:VerifiedIdentity){
      requireProof(identity);const at=now(),id='dc:'+crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO dc_identity_principals(id,state,origin_issuer,origin_subject,created_at) SELECT ?,'active',?,?,? WHERE NOT EXISTS(SELECT 1 FROM dc_identity_aliases WHERE issuer=? AND subject=?) ON CONFLICT DO NOTHING").bind(id,identity.issuer,identity.subject,at,identity.issuer,identity.subject),
        db.prepare("INSERT INTO dc_identity_aliases(issuer,subject,principal_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM dc_identity_principals WHERE id=? AND state='active' AND origin_issuer=? AND origin_subject=?) ON CONFLICT DO NOTHING").bind(identity.issuer,identity.subject,id,at,id,identity.issuer,identity.subject),
      ]);
      const row=await lookup(identity);if(!row)throw new IdentityError('Account could not be created.',409);
      await active(row.principal_id);return {userId:row.principal_id};
    },
    async resolve(identity:VerifiedIdentity){requireProof(identity);const row=await lookup(identity);if(!row)throw new IdentityError('Account linking or registration is required.',404);await active(row.principal_id);return {userId:row.principal_id};},
    async beginLink(legacy:VerifiedIdentity,external:VerifiedIdentity){
      requireProof(legacy,true,true);requireProof(external,false,true);
      const owner=await lookup(legacy);if(!owner||owner.principal_id!==legacy.subject)throw new IdentityError('Legacy account is not registered.',404);
      await active(owner.principal_id);
      const existing=await lookup(external);if(existing&&existing.principal_id!==owner.principal_id)throw new IdentityError('Identity already belongs to another account.',409);
      const ticket=crypto.randomUUID()+crypto.randomUUID(),id=crypto.randomUUID(),at=now(),expiresAt=at+5*60000;
      await db.prepare('INSERT INTO dc_identity_challenges(id,ticket_hash,principal_id,source_subject,target_issuer,target_subject,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,await hash(ticket),owner.principal_id,legacy.subject,external.issuer,external.subject,expiresAt,at).run();
      return {ticket,expiresAt};
    },
    async completeLink(ticket:string,legacy:VerifiedIdentity,external:VerifiedIdentity,confirmed:boolean,finalize?:(receipt:{challengeId:string;operationId:string;principalId:string})=>D1PreparedStatement[]){
      requireProof(legacy,true,true);requireProof(external,false,true);
      if(confirmed!==true)throw new IdentityError('Explicit linking confirmation required.',400);
      if(typeof ticket!=='string'||!/^[0-9a-f-]{72}$/.test(ticket))throw new IdentityError('Link proof invalid.');
      const row=await db.prepare('SELECT id,principal_id,source_subject,target_issuer,target_subject,expires_at,consumed_at FROM dc_identity_challenges WHERE ticket_hash=?').bind(await hash(ticket)).first<Challenge>();
      const at=now(),operation=crypto.randomUUID();
      if(!row||row.consumed_at!==null||row.expires_at<=at||row.source_subject!==legacy.subject||row.principal_id!==legacy.subject||row.target_issuer!==external.issuer||row.target_subject!==external.subject)throw new IdentityError('Link proof expired or does not match.');
      await active(row.principal_id);
      const guard="EXISTS(SELECT 1 FROM dc_identity_challenges c JOIN dc_identity_principals p ON p.id=c.principal_id WHERE c.id=? AND c.consumed_at IS NULL AND c.expires_at>? AND p.state='active')";
      await db.batch([
        db.prepare(`INSERT INTO dc_identity_aliases(issuer,subject,principal_id,created_at) SELECT ?,?,?,? WHERE ${guard} ON CONFLICT DO NOTHING`).bind(external.issuer,external.subject,row.principal_id,at,row.id,at),
        db.prepare(`INSERT INTO dc_identity_link_receipts(challenge_id,principal_id,operation_id,created_at) SELECT ?,?,?,? WHERE ${guard} AND EXISTS(SELECT 1 FROM dc_identity_aliases WHERE issuer=? AND subject=? AND principal_id=?) ON CONFLICT DO NOTHING`).bind(row.id,row.principal_id,operation,at,row.id,at,external.issuer,external.subject,row.principal_id),
        db.prepare('UPDATE dc_identity_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM dc_identity_link_receipts WHERE challenge_id=?)').bind(at,row.id,row.id),
        ...(finalize?.({challengeId:row.id,operationId:operation,principalId:row.principal_id})??[]),
      ]);
      const receipt=await db.prepare('SELECT principal_id,operation_id FROM dc_identity_link_receipts WHERE challenge_id=?').bind(row.id).first<{principal_id:string;operation_id:string}>();
      if(!receipt||receipt.operation_id!==operation)throw new IdentityError('Identity collision or account state changed.',409);
      await active(receipt.principal_id);return {userId:receipt.principal_id};
    },
  };
}

// Validates evidence, never calls deploy or changes DNS. Output is fail-closed.
import {readFile} from 'node:fs/promises';
import {candidateHash} from './candidate-hash.mjs';
import {fileURLToPath} from 'node:url';
export const requiredChecks=['providerEmailDelivery','runtimeHttpTests','browserSignIn','browserRefreshLogout','wrongExpiredReplayedCode','legacyOwnershipLink','crossUserIsolation','firstWorkoutRpeRir','privateFiles','d1RestoreAndCompare','r2RestoreAndMetadataCompare','legacyBridgeInstalled','productionSecretsVerified','domainTlsAndRedirectsPrepared','allFeatureSmokeTests','rollbackRehearsed'];
export function deploymentGate(e){const required=requiredChecks;const missing=required.filter(k=>e?.checks?.[k]!==true);if(e?.sourceCommit!=='ce4cba9f3e5c703bf84b801e05491070a00fe947')missing.push('version171Source');if(typeof e?.candidateHash!=='string'||!/^[a-f0-9]{64}$/.test(e.candidateHash))missing.push('candidateHash');if(typeof e?.verifiedAt!=='string'||!Number.isFinite(Date.parse(e.verifiedAt))||Date.now()-Date.parse(e.verifiedAt)>86400000)missing.push('freshEvidence');return {ready:missing.length===0,missing};}
export function boundDeploymentGate(e, actualHash, now=Date.now()) {
 const result=deploymentGate(e);
 if(!actualHash || e?.candidateHash!==actualHash)result.missing.push('candidateSourceMismatch');
 if(Date.parse(e?.verifiedAt)>now)result.missing.push('futureEvidence');
 return {...result,ready:result.missing.length===0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try {const e=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):null;
 const root=process.argv[3]||fileURLToPath(new URL('../../',import.meta.url));
 const result=boundDeploymentGate(e,await candidateHash(root));console.log(JSON.stringify(result));process.exitCode=result.ready?0:2;
 }catch{console.error('Deployment evidence could not be verified.');process.exitCode=2;}
}

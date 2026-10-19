import test from 'node:test';
import assert from 'node:assert/strict';
import {signLink,verifyLink} from '../standalone/crypto.ts';

test('link signatures accept Node and JOSE Ed25519 key spellings across runtimes',async()=>{
 const keys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const privateKey=await crypto.subtle.exportKey('jwk',keys.privateKey),publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);
 const now=Date.now(),proof={iss:'legacy',aud:'https://app.example.test',sub:'old-user',target:'new-user',email:'synthetic@example.test',nonce:crypto.randomUUID()+crypto.randomUUID(),iat:now,exp:now+300000};
 for(const alg of ['Ed25519','EdDSA',undefined]){
  const token=await signLink(proof,{...privateKey,alg});
  assert.deepEqual(await verifyLink(token,{...publicKey,alg},proof.iss,proof.aud,now),proof);
 }
 for(const change of [{alg:'ES256'},{kty:'RSA'},{crv:'X25519'}]){
  await assert.rejects(signLink(proof,{...privateKey,...change}),/Ed25519 linking key required/);
  const token=await signLink(proof,privateKey);
  await assert.rejects(verifyLink(token,{...publicKey,...change},proof.iss,proof.aud,now),/Ed25519 linking key required/);
 }
 const other=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 await assert.rejects(verifyLink(await signLink(proof,privateKey),await crypto.subtle.exportKey('jwk',other.publicKey),proof.iss,proof.aud,now),/Invalid link signature/);
});

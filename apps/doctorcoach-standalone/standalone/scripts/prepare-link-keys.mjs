// Offline only. Generates new test signing keys; never uploads or prints secrets.
import {generateKeyPairSync} from 'node:crypto';
import {mkdir,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function prepareLinkKeys(directory){
 // Exclusive directory creation prevents replacement of an existing key bundle.
 const target=path.resolve(directory);await mkdir(target,{mode:0o700});
 const make=()=>{const pair=generateKeyPairSync('ed25519');return {publicKey:pair.publicKey.export({format:'jwk'}),privateKey:pair.privateKey.export({format:'jwk'})};};
 const legacy=make(),external=make();
 const files={
  'old-runtime-secrets.json':{DC_LEGACY_PRIVATE_JWK:JSON.stringify(legacy.privateKey),DC_EXTERNAL_PUBLIC_JWK:JSON.stringify(external.publicKey)},
  'new-runtime-secrets.json':{DC_LINK_PRIVATE_JWK:JSON.stringify(external.privateKey),DC_LEGACY_PUBLIC_JWK:JSON.stringify(legacy.publicKey)},
  'public-keys.json':{legacy:legacy.publicKey,external:external.publicKey},
 };
 for(const [name,value]of Object.entries(files))await writeFile(path.join(target,name),JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});
 return {directory:await realpath(target),files:Object.keys(files)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==3)throw Error();await prepareLinkKeys(process.argv[2]);console.log('Created a new private key bundle. No keys uploaded. Keep it outside Git and chat.');}
 catch{console.error('Key preparation failed; use a new, non-existing directory. Never overwrite working keys.');process.exitCode=1;}
}

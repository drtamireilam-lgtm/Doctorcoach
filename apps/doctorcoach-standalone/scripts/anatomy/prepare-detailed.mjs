import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {convertDetailedAtlas,sourceUrl,sourceSha} from './detailed-asset.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const cache=resolve(root,'.sites-runtime/detailed-source.glb');
await mkdir(resolve(root,'.sites-runtime'),{recursive:true});
let source;try{source=await readFile(cache);}catch{
 const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('Unable to obtain pinned detailed anatomy asset');
 const contentLength=Number(response.headers.get('content-length'));if(contentLength>16*1024*1024)throw Error('Detailed source exceeds budget');
 source=Buffer.from(await response.arrayBuffer());if(source.length>16*1024*1024)throw Error('Detailed source exceeds budget');
 if(createHash('sha256').update(source).digest('hex')!==sourceSha)throw Error('Detailed source checksum mismatch');
 await writeFile(cache,source);
}
const catalogue=JSON.parse(await readFile(resolve(root,'lib/prepared/musculoskeletal-model.json'),'utf8')).structures;
const cards=JSON.parse(await readFile(resolve(root,'lib/prepared/anatomy-learning.json'),'utf8'));
const muscleNames=JSON.parse(await readFile(resolve(root,'lib/prepared/muscles.json'),'utf8'));
for(const card of cards){
 const existing=muscleNames.find(m=>m.slug===card.slug);
 const he=existing?.name_he??({'rectus-abdominis':'הישר הבטני','internal-oblique':'האלכסוני הפנימי'}[card.slug]);
 if(he)catalogue.push({id:card.slug,learningId:card.slug,regionId:card.region,layer:'muscle',side:'both',en:existing?.name_en??card.slug.replaceAll('-',' '),he});
}
const {bytes,asset}=convertDetailedAtlas(source,catalogue);
const output=JSON.stringify(asset,null,2)+'\n';
const manifest=resolve(root,'lib/prepared/detailed-model.json');
if(process.argv.includes('--generate-manifest'))await writeFile(manifest,output);
else if(await readFile(manifest,'utf8')!==output)throw Error('Detailed manifest does not match the pinned source and catalogue');
await writeFile(resolve(root,'public/anatomy/detailed.glb'),bytes);
await writeFile(resolve(root,'public/anatomy/detailed-source-and-license.json'),output);
console.log(`Detailed whole-body asset verified: ${asset.structures.length} structures, ${bytes.length} bytes.`);

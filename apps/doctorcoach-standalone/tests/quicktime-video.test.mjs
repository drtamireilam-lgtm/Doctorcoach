import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach,stranger} from './platform-db.mjs';
import {readVideoBody} from '../lib/media-store.ts';
import {videoFileMime} from '../lib/video-format.ts';
import {videoFileProblem,exerciseIdFromFilename} from '../lib/bulk-video.ts';
function mov(){const bytes=new Uint8Array(64);new DataView(bytes.buffer).setUint32(0,20);bytes.set(new TextEncoder().encode('ftypqt  '),4);bytes.set(new TextEncoder().encode('qt  '),16);return bytes;}
const request=bytes=>new Request('https://example.test/video',{method:'PUT',body:bytes});
test('phone MOV type and absent MIME normalize consistently for single and bulk uploads',()=>{
 for(const type of ['video/quicktime','','application/octet-stream']){
  const file={name:'goblet.MOV',type,size:64};
  assert.equal(videoFileMime(file),'video/quicktime');assert.equal(videoFileProblem(file),'');
 }
 assert.equal(videoFileMime({name:'fake.mov',type:'text/html'}),'');
 assert.equal(exerciseIdFromFilename('goblet-demo.MOV',new Set(['goblet'])),'goblet');
});
test('MOV byte validation accepts QuickTime header and rejects relabelled HTML, MP4 and malformed boxes',async()=>{
 assert.deepEqual(await readVideoBody(request(mov()),64,'video/quicktime'),mov());
 const mp4=mov();mp4.set(new TextEncoder().encode('isom'),8);
 const malformed=mov();new DataView(malformed.buffer).setUint32(0,9999);
 for(const bytes of [new Uint8Array(64).fill(60),mp4,malformed])await assert.rejects(()=>readVideoBody(request(bytes),64,'video/quicktime'));
 await assert.rejects(()=>readVideoBody(request(mov()),64,'text/html'));
});
test('QuickTime reviews retain owner and assigned-coach privacy boundaries',async t=>{
 const f=platform(t);await f.connect();const id=randomUUID();
 await f.media.initialize(client,{id,kind:'review',exerciseId:'goblet',caption:'Synthetic MOV',mime:'video/quicktime',bytes:64});await f.media.ready(client,id);
 assert.equal((await f.media.readable(client,id)).mime,'video/quicktime');
 assert.equal((await f.media.readable(coach,id)).id,id);
 await assert.rejects(()=>f.media.readable(stranger,id),e=>e.status===403);
});

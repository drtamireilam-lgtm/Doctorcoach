import test from 'node:test';
import assert from 'node:assert/strict';
import {trimRange,trimVideoFile,MAX_TRIM_SOURCE} from '../lib/video-trim.ts';
function harness({unsupported=false,fail=false,abortOnExecute=null}={}){
 const seen={};
 class Input{async computeDuration(){return 30;}async getPrimaryVideoTrack(){return {};}dispose(){seen.disposed=true;}}
 class BufferTarget{constructor(){this.buffer=new Uint8Array(64).buffer;}on(){}}
 class Output{constructor(options){Object.assign(this,options);}}
 const conversion={isValid:!unsupported,discardedTracks:unsupported?[{reason:'no_encodable_target_codec'}]:[],async execute(){seen.executed=true;abortOnExecute?.abort();if(fail)throw new Error('encoding failed');},async cancel(){seen.cancelled=true;}};
 const load=async()=>({Input,Output,BufferTarget,BlobSource:class{},Mp4OutputFormat:class{},ALL_FORMATS:[],Conversion:{async init(options){seen.options=options;return conversion;}}});
 return {seen,load};
}
const source=()=>new File([new Uint8Array(100)],'original.mov',{type:'video/quicktime'});
const options=()=>({signal:new AbortController().signal,keepAudio:true,onProgress:()=>{}});
test('trim bounds reject reversed, non-finite, oversized and out-of-source selections',()=>{
 assert.deepEqual(trimRange(30,3,12),{start:3,end:12});
 for(const [duration,start,end] of [[30,12,3],[30,-1,12],[30,0,31],[30,0,0],[NaN,0,1],[30,0,Infinity],[601,0,2],[200,0,121]])assert.throws(()=>trimRange(duration,start,end));
});
test('only a newly encoded clip is prepared, with exact requested range, no packet-copy expansion or original metadata',async()=>{
 const f=harness(),original=source(),result=await trimVideoFile(original,{start:3,end:12},options(),f.load);
 assert.notEqual(result,original);assert.equal(result.type,'video/mp4');assert.equal(result.name,'doctorcoach-clip.mp4');
 assert.deepEqual(f.seen.options.trim,{start:3,end:12});assert.equal(f.seen.options.copy,false);assert.deepEqual(f.seen.options.tags,{});
 assert.equal(f.seen.options.video.forceTranscode,true);assert.equal(f.seen.options.audio.forceTranscode,true);assert.equal(f.seen.disposed,true);
});
test('unsupported codec, encoding failure and cancellation never fall back to the original file',async()=>{
 for(const config of [{unsupported:true},{fail:true}]){const f=harness(config);await assert.rejects(()=>trimVideoFile(source(),{start:3,end:12},options(),f.load));assert.equal(f.seen.disposed,true);}
 const controller=new AbortController(),f=harness({abortOnExecute:controller});
 await assert.rejects(()=>trimVideoFile(source(),{start:3,end:12},{...options(),signal:controller.signal},f.load));assert.equal(f.seen.cancelled,true);assert.equal(f.seen.disposed,true);
});
test('muting is explicit and oversized source is rejected before starting conversion',async()=>{
 const f=harness();await trimVideoFile(source(),{start:3,end:12},{...options(),keepAudio:false},f.load);assert.deepEqual(f.seen.options.audio,{discard:true});
 await assert.rejects(()=>trimVideoFile({size:MAX_TRIM_SOURCE+1},{start:3,end:12},options(),()=>{throw new Error('must not load');}),/200 MB/);
});

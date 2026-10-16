export const MAX_TRIM_SOURCE=200*1024*1024;
export const MAX_TRIM_OUTPUT=25*1024*1024;
export function trimRange(duration:number,start:number,end:number){
 if(![duration,start,end].every(Number.isFinite)||duration<=0||duration>600||start<0||end>duration||end-start<.25||end-start>120)throw new Error('בחרו קטע של רבע שנייה עד שתי דקות, מתוך סרטון שאורכו עד עשר דקות.');
 return {start,end};
}
/** Runs locally only. Never returns the original on failure and never uses a network upload. */
export async function trimVideoFile(file:File,range:{start:number;end:number},options:{signal:AbortSignal;keepAudio:boolean;onProgress:(n:number)=>void;brand?:{qr:boolean}},load:()=>Promise<typeof import('mediabunny')>=()=>import('mediabunny')){
 if(file.size>MAX_TRIM_SOURCE)throw new Error('לחיתוך במכשיר בחרו סרטון עד 200 MB.');
 options.signal.throwIfAborted();
 const {Input,Output,BlobSource,ALL_FORMATS,Mp4OutputFormat,BufferTarget,Conversion}=await load();
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});
 let conversion:Awaited<ReturnType<typeof Conversion.init>>|undefined;
 const cancel=()=>{void conversion?.cancel().catch(()=>{});};
 try{
  const duration=await input.computeDuration();const trim=trimRange(duration,range.start,range.end);
  if(!await input.getPrimaryVideoTrack())throw new Error('לא נמצא ערוץ וידאו בקובץ.');
  options.signal.throwIfAborted();
  const target=new BufferTarget();const output=new Output({format:new Mp4OutputFormat(),target});
  const branding=options.brand?await (await import('./video-branding.ts')).createVideoBranding(options.brand.qr):undefined;
  conversion=await Conversion.init({input,output,tracks:'primary',trim,copy:false,tags:{},video:{codec:'avc',forceTranscode:true,...(branding?{process:branding,allowTransformationMetadata:false}:{})},audio:options.keepAudio?{codec:'aac',forceTranscode:true}:{discard:true}});
  options.signal.throwIfAborted();
  if(!conversion.isValid||conversion.discardedTracks.some(t=>t.reason!=='discarded_by_user'))throw new Error('הדפדפן אינו תומך בחיתוך הקידוד הזה. נסו דפדפן מעודכן; המקור לא הועלה. אפשר לבחור חיתוך ללא קול במפורש.');
  options.signal.addEventListener('abort',cancel,{once:true});
  let tooLarge=false;
  target.on('write',({end})=>{if(end>MAX_TRIM_OUTPUT){tooLarge=true;cancel();}});
  conversion.onProgress=n=>options.onProgress(Math.round(n*100));
  await conversion.execute();options.signal.throwIfAborted();
  if(tooLarge||!target.buffer||target.buffer.byteLength<32||target.buffer.byteLength>MAX_TRIM_OUTPUT)throw new Error('הקטע החתוך גדול מדי או אינו תקין. בחרו קטע קצר יותר.');
  return new File([target.buffer],'doctorcoach-clip.mp4',{type:'video/mp4'});
 }finally{options.signal.removeEventListener('abort',cancel);await conversion?.cancel().catch(()=>{});input.dispose();}
}

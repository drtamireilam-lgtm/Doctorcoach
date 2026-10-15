type Bucket={put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;delete(key:string):Promise<unknown>};
// Each attempt owns its object; losing or rejected attempts cannot delete a
// different attempt's committed video.
export async function commitVideoUpload(bucket:Bucket,id:string,mime:string,bytes:Uint8Array,finalize:(key:string)=>Promise<boolean>){
 const key=`videos/${id}/${crypto.randomUUID()}`;
 try{
  await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});
  if(!await finalize(key))await bucket.delete(key);
 }catch(error){await bucket.delete(key);throw error;}
}

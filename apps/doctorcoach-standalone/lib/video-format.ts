export const videoMimes=['video/mp4','video/webm','video/quicktime'] as const;
export const videoAccept='video/mp4,video/webm,video/quicktime,.mov';
export const isVideoMime=(mime:string)=>videoMimes.some(value=>value===mime);
// Some phone pickers omit MIME. Infer only recognized suffixes; the server still validates bytes.
export function videoFileMime(file:{type:string;name:string}){
 if(isVideoMime(file.type))return file.type;
 if(file.type&&file.type!=='application/octet-stream')return '';
 return ({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'} as Record<string,string>)[file.name.split('.').pop()?.toLowerCase()??'']??'';
}
export function quickTimeHeader(bytes:Uint8Array){
 if(bytes.length<16)return false;
 const size=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);
 return size>=16&&size<=bytes.length&&new TextDecoder().decode(bytes.subarray(4,12))==='ftypqt  ';
}

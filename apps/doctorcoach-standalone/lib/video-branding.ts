import type {VideoSample} from 'mediabunny';
export const BRAND_APP_URL='https://doctorcoach-standalone-staging.dr-tamireilam.workers.dev/';
export function brandLayout(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<120||height<120)throw new Error('רזולוציית הסרטון נמוכה מדי למיתוג.');
 const logo=Math.round(Math.min(width*.09,height*.16)),margin=Math.round(width*.025),font=Math.max(10,Math.round(logo*.3));
 const y=Math.round(height*.84-logo);
 return {x:margin,y,logo,font,qrSize:Math.round(Math.min(width*.18,height*.28)),margin};
}
export async function createVideoBranding(includeQr:boolean){
 const image=new Image();image.src='/branding/doctorcoach-drc-v1.webp';await image.decode();
 const qr=includeQr?(await import('qrcode')).default.create(BRAND_APP_URL,{errorCorrectionLevel:'M'}):null;
 let canvas:HTMLCanvasElement|undefined;
 return (sample:VideoSample)=>{
  const w=sample.displayWidth,h=sample.displayHeight,l=brandLayout(w,h);
  if(!canvas){canvas=document.createElement('canvas');}canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('לא ניתן להוסיף מיתוג בדפדפן הזה.');
  sample.draw(ctx,0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(l.x-4,l.y-4,l.logo*3.2,l.logo+8);
  ctx.drawImage(image,l.x,l.y,l.logo,l.logo);ctx.fillStyle='#ffffff';ctx.font=`bold ${l.font}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('DoctorCoach',l.x+l.logo+8,l.y+l.logo/2,l.logo*2);
  if(qr){
   const modules=qr.modules.size,cell=Math.floor(l.qrSize/(modules+8));
   if(cell<3)throw new Error('הסרטון קטן מדי ל־QR קריא. בטלו QR או בחרו סרטון ברזולוציה גבוהה יותר.');
   const size=cell*(modules+8),x=l.x,y=l.y-size-10;if(y<0)throw new Error('אין מקום ל־QR בסרטון הזה.');
   ctx.fillStyle='#ffffff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#000000';
   for(let r=0;r<modules;r++)for(let c=0;c<modules;c++)if(qr.modules.get(r,c))ctx.fillRect(x+(c+4)*cell,y+(r+4)*cell,cell,cell);
  }
  return canvas;
 };
}

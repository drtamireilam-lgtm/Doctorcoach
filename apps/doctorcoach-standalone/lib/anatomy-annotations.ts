export type ScreenPoint={x:number;y:number};
/** CSS pixels relative to the canvas host; geometry projection belongs to the renderer. */
export function positionAnnotation(point:ScreenPoint,viewport:{width:number;height:number},label:{width:number;height:number},direction:'rtl'|'ltr'){
 const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
 const width=Math.min(label.width,Math.max(0,viewport.width-24)),height=Math.min(label.height,Math.max(0,viewport.height-24));
 const anchor={x:clamp(point.x,8,viewport.width-8),y:clamp(point.y,8,viewport.height-8)};
 const right=anchor.x+28,left=anchor.x-width-28;
 const preferred=direction==='rtl'?left:right,alternate=direction==='rtl'?right:left;
 const fits=(x:number)=>x>=12&&x+width<=viewport.width-12;
 const x=clamp(fits(preferred)?preferred:fits(alternate)?alternate:preferred,12,viewport.width-width-12);
 // On narrow screens a label cannot fit beside the muscle: place above/below it.
 const overlap=x<anchor.x+12&&x+width>anchor.x-12;
 const y=clamp(overlap?(anchor.y>viewport.height/2?anchor.y-height-28:anchor.y+28):anchor.y-height/2,12,viewport.height-height-12);
 const end={x:clamp(anchor.x,x,x+width),y:clamp(anchor.y,y,y+height)};
 return {left:x,top:y,width,height,anchor,end,offscreen:point.x!==anchor.x||point.y!==anchor.y};
}

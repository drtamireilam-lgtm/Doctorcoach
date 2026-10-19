import surfaces from './appearance-surfaces.json' with {type:'json'};
import {palettes, type Appearance, type CustomColors} from './appearance.ts';

export function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function textOn(color:string){return contrast('#ffffff',color)>=contrast('#000000',color)?'#ffffff':'#000000';}
export function mix(a:string,b:string,amount:number){return '#'+[0,1,2].map(i=>Math.round(parseInt(a.slice(1+i*2,3+i*2),16)*(1-amount)+parseInt(b.slice(1+i*2,3+i*2),16)*amount).toString(16).padStart(2,'0')).join('');}
export function readableAccent(color:string,background:string){if(contrast(color,background)>=4.5)return color;const goal=textOn(background);for(let i=1;i<=20;i++){const c=mix(color,goal,i/20);if(contrast(c,background)>=4.5)return c;}return goal;}
function mutedOn(background:string){return readableAccent(mix(background,textOn(background),.72),background);}
export function colorsFor(a:Appearance):CustomColors{
 if(a.custom)return {...a.custom};
 const v=surfaces[a.palette][a.mode==='light'?1:0],p=palettes.find(p=>p.id===a.palette)!;
 return {background:v[0],primary:p.button,secondary:v[1],button:p.button,navigation:v[0],accent:v[6]};
}
export function fromPrimary(primary:string,mode:Appearance['mode']):CustomColors{
 const base=mode==='dark'?'#080b12':'#ffffff';
 return {primary,background:mix(primary,base,mode==='dark'?.73:.82),secondary:mix(primary,base,mode==='dark'?.60:.92),button:primary,navigation:mix(primary,base,mode==='dark'?.80:.72),accent:primary};
}
/** Switching modes regenerates the three surfaces but preserves independently chosen controls. */
export function appearanceWithMode(a:Appearance,mode:Appearance['mode']):Appearance{
 if(a.mode===mode)return a;
 if(!a.custom)return {...a,mode};
 const regenerated=fromPrimary(a.custom.primary,mode);
 return {...a,mode,custom:{...a.custom,background:regenerated.background,secondary:regenerated.secondary,navigation:regenerated.navigation}};
}
export const themePresets:{id:string;name:string;he:string;appearance:Appearance}[]=[
 {id:'classic',name:'DoctorCoach Classic — Red & Black',he:'DoctorCoach קלאסי — אדום ושחור',appearance:{mode:'dark',palette:'red',custom:{background:'#0c0c10',primary:'#cf2434',secondary:'#19191f',button:'#cf2434',navigation:'#08080b',accent:'#ff8991'}}},
 {id:'dark',name:'Dark',he:'כהה',appearance:{mode:'dark',palette:'neutral'}},
 {id:'light',name:'Light',he:'בהיר',appearance:{mode:'light',palette:'neutral'}},
 {id:'professional',name:'Blue',he:'כחול',appearance:{mode:'dark',palette:'blue'}},
 {id:'modern',name:'Purple',he:'סגול',appearance:{mode:'dark',palette:'purple'}},
 {id:'wine',name:'Wine Red',he:'אדום יין',appearance:{mode:'dark',palette:'red',custom:{background:'#35101f',primary:'#9f254f',secondary:'#4b1c30',button:'#9f254f',navigation:'#280c17',accent:'#ffb1ce'}}},
 {id:'yellow',name:'Yellow',he:'צהוב',appearance:{mode:'dark',palette:'yellow'}},
 {id:'sport',name:'Forest Green',he:'ירוק יער',appearance:{mode:'dark',palette:'green'}},
];
export const resetAppearance=themePresets[0].appearance;
export function themeTokens(a:Appearance):Record<string,string>{
 const c=colorsFor(a),bg=c.background,card=c.secondary,nav=c.navigation;
 return {
 '--dc-canvas-text':textOn(bg),'--dc-canvas-muted':mutedOn(bg),'--dc-canvas-accent':readableAccent(c.accent,bg),
 '--canvas':bg,'--card':card,'--raised':card,'--text':textOn(bg),'--muted':mutedOn(bg),
 '--line':mix(bg,textOn(bg),.5),'--input':mix(card,textOn(card),.5),'--red':c.primary,'--lime':readableAccent(c.accent,bg),'--soft-red':mix(bg,c.primary,.18),'--accent-red':readableAccent(c.accent,bg),
 '--dc-card-text':textOn(card),'--dc-card-muted':mutedOn(card),'--dc-card-accent':readableAccent(c.accent,card),'--dc-card-line':mix(card,textOn(card),.5),
 '--dc-button':c.button,'--dc-button-text':textOn(c.button),'--dc-primary-text':textOn(c.primary),
 '--dc-nav':nav,'--dc-nav-text':textOn(nav),'--dc-nav-muted':mutedOn(nav),'--dc-nav-accent':readableAccent(c.accent,nav),'--dc-nav-active':mix(nav,c.primary,.18),
 '--palette-button':c.button,'--palette-soft':card,'--palette-ink':textOn(card),
 };
}
export const swatchFamilies=[
 ['אדום','Red','#7f1d1d','#dc2626','#f87171'],['כתום','Orange','#9a3412','#ea580c','#fb923c'],['צהוב','Yellow','#a16207','#eab308','#fde047'],
 ['ירוק','Green','#166534','#16a34a','#86efac'],['טורקיז','Teal','#115e59','#14b8a6','#99f6e4'],['כחול','Blue','#1e3a8a','#2563eb','#93c5fd'],
 ['סגול','Purple','#581c87','#9333ea','#d8b4fe'],['ורוד','Pink','#831843','#db2777','#f9a8d4'],['אפור','Gray','#374151','#6b7280','#d1d5db'],
 ['שחור ולבן','Black & white','#000000','#ffffff','#f3f4f6'],
] as const;

export type ThemeEditState={saved:Appearance;draft:Appearance|null;preview:boolean};
export type ThemeEditAction={type:'load'|'edit'|'commit';appearance:Appearance}|{type:'cancel'|'preview'};
export function themeEditReducer(state:ThemeEditState,action:ThemeEditAction):ThemeEditState{
 switch(action.type){
 case 'load':case 'commit':return {saved:action.appearance,draft:null,preview:false};
 case 'edit':return {...state,draft:action.appearance,preview:true};
 case 'cancel':return {...state,draft:null,preview:false};
 case 'preview':return {...state,preview:true};
 }
}

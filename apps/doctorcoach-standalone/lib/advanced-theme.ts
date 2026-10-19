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
{id:"dark",name:"Dark",he:"שחור קלאסי",appearance:{"mode": "dark", "palette": "neutral", "custom": {"background": "#090c12", "primary": "#77869e", "secondary": "#171c26", "button": "#77869e", "navigation": "#090c12", "accent": "#c5d3eb"}}},
{id:"light",name:"Light",he:"לבן נקי",appearance:{"mode": "light", "palette": "neutral", "custom": {"background": "#f5f7fb", "primary": "#344663", "secondary": "#ffffff", "button": "#344663", "navigation": "#f5f7fb", "accent": "#334f7c"}}},
{id:"gold",name:"Premium Gold",he:"זהב מטאלי",appearance:{"mode": "dark", "palette": "yellow", "custom": {"background": "#14110b", "primary": "#d9b65f", "secondary": "#252015", "button": "#d9b65f", "navigation": "#14110b", "accent": "#f2d691"}}},
{id:"silver",name:"Premium Silver",he:"כסף מטאלי",appearance:{"mode": "dark", "palette": "neutral", "custom": {"background": "#10141b", "primary": "#b8c5d8", "secondary": "#202731", "button": "#b8c5d8", "navigation": "#10141b", "accent": "#e1e8f4"}}},
{id:"coral",name:"Dark Coral",he:"אדום קורל",appearance:{"mode": "dark", "palette": "red", "custom": {"background": "#190e12", "primary": "#ee736c", "secondary": "#301b22", "button": "#ee736c", "navigation": "#190e12", "accent": "#ffb0a5"}}},
{id:"professional",name:"Dark Blue",he:"כחול עמוק",appearance:{"mode": "dark", "palette": "blue", "custom": {"background": "#091329", "primary": "#538ce5", "secondary": "#142744", "button": "#538ce5", "navigation": "#091329", "accent": "#a6c9ff"}}},
{id:"modern",name:"Purple",he:"סגול עשיר",appearance:{"mode": "dark", "palette": "purple", "custom": {"background": "#180e29", "primary": "#a37ae8", "secondary": "#2b1c44", "button": "#a37ae8", "navigation": "#180e29", "accent": "#dbc0ff"}}},
{id:"wine",name:"Wine Red",he:"אדום יין",appearance:{"mode": "dark", "palette": "red", "custom": {"background": "#210c17", "primary": "#bd5279", "secondary": "#3c1829", "button": "#bd5279", "navigation": "#210c17", "accent": "#ffb1ce"}}},
{id:"sport",name:"Forest Green",he:"ירוק אמרלד",appearance:{"mode": "dark", "palette": "green", "custom": {"background": "#081b15", "primary": "#49b98d", "secondary": "#12352a", "button": "#49b98d", "navigation": "#081b15", "accent": "#9fe6c6"}}},
{id:"yellow",name:"Yellow",he:"צהוב עשיר",appearance:{"mode": "dark", "palette": "yellow", "custom": {"background": "#191606", "primary": "#ebcb52", "secondary": "#302b10", "button": "#ebcb52", "navigation": "#191606", "accent": "#ffe89a"}}},
{id:"amber",name:"Amber Orange",he:"כתום ענבר",appearance:{"mode": "dark", "palette": "orange", "custom": {"background": "#211207", "primary": "#eaa44e", "secondary": "#3a2410", "button": "#eaa44e", "navigation": "#211207", "accent": "#ffd099"}}},
{id:"teal",name:"Teal Cyan",he:"טורקיז",appearance:{"mode": "dark", "palette": "teal", "custom": {"background": "#071c21", "primary": "#52c4d0", "secondary": "#11343b", "button": "#52c4d0", "navigation": "#071c21", "accent": "#a3eef3"}}},
{id:"rose",name:"Rose Pink",he:"ורוד",appearance:{"mode": "dark", "palette": "pink", "custom": {"background": "#210f1c", "primary": "#df88b7", "secondary": "#3b2033", "button": "#df88b7", "navigation": "#210f1c", "accent": "#ffc4e5"}}}
];
export const resetAppearance=themePresets[0].appearance;
export function themeTokens(a:Appearance):Record<string,string>{
 const c=colorsFor(a),bg=c.background,card=c.secondary,nav=c.navigation;
 const preset=themePresets.find(p=>JSON.stringify(p.appearance)===JSON.stringify(a));
 const metallic=preset?.id==='gold'||preset?.id==='silver';
 const sheen=mix(c.button,textOn(c.button)==='#000000'?'#ffffff':'#000000',.12);
 const buttonGradient=metallic?`linear-gradient(115deg, ${c.button}, ${mix(c.button,'#ffffff',.18)} 38%, ${sheen} 62%, ${c.button})`:`linear-gradient(135deg, ${c.button}, ${sheen})`;
 return {
 '--dc-button-gradient':buttonGradient,'--dc-surface-gradient':`linear-gradient(145deg, ${card}, ${mix(card,bg,.28)})`,'--dc-canvas-gradient':`linear-gradient(150deg, ${bg}, ${mix(bg,card,.35)})`,'--dc-hover':mix(card,c.accent,.12),'--dc-focus':readableAccent(c.accent,bg),
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

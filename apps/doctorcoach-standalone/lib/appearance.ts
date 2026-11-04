export const palettes=[
 {id:'red',he:'אדום',en:'Red',button:'#cf2434',light:'#ae1b2c',dark:'#ff8991',softLight:'#fff0f1',softDark:'#321b22'},
 {id:'blue',he:'כחול',en:'Blue',button:'#1d4ed8',light:'#1d4ed8',dark:'#93b4ff',softLight:'#edf3ff',softDark:'#182747'},
 {id:'pink',he:'ורוד',en:'Pink',button:'#be185d',light:'#be185d',dark:'#ff9dcb',softLight:'#fff0f7',softDark:'#361d2c'},
 {id:'green',he:'ירוק',en:'Green',button:'#147d43',light:'#146c3b',dark:'#80dbac',softLight:'#edf9f1',softDark:'#182e25'},
 {id:'purple',he:'סגול',en:'Purple',button:'#7e22ce',light:'#7e22ce',dark:'#d2a7ff',softLight:'#f6efff',softDark:'#2b2040'},
 {id:'orange',he:'כתום',en:'Orange',button:'#b54708',light:'#a33e08',dark:'#ffb77c',softLight:'#fff3e8',softDark:'#36251b'},
 {id:'teal',he:'טורקיז',en:'Teal',button:'#0f766e',light:'#0f766e',dark:'#74dbd0',softLight:'#eaf9f7',softDark:'#17302f'},
 {id:'yellow',he:'צהוב',en:'Yellow',button:'#664700',light:'#664700',dark:'#ffe59b',softLight:'#fff2bd',softDark:'#3a2a10'},
 {id:'neutral',he:'קלאסי',en:'Classic',button:'#475569',light:'#334155',dark:'#d2dcea',softLight:'#edf1f6',softDark:'#252b35'},
] as const;
export type Palette=typeof palettes[number]['id'];
export type Appearance={mode:'light'|'dark';palette:Palette;custom?:CustomColors};
export const defaultAppearance:Appearance={mode:'dark',palette:'teal',custom:{background:'#030b14',primary:'#00e5f0',secondary:'#071827',button:'#f5b942',navigation:'#030b14',accent:'#00e5f0'}};
export function isPalette(value:unknown):value is Palette{return palettes.some(p=>p.id===value);}
export function isAppearance(value:unknown):value is Appearance{
 if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;
 return (v.mode==='light'||v.mode==='dark')&&isPalette(v.palette)&&(v.custom===undefined||isCustomColors(v.custom));
}
export const PALETTE_STORAGE_KEY='doctorcoach-palette';
export function parseAppearanceResponse(value:unknown):{appearance:Appearance|null;version:number}{
 if(!value||typeof value!=='object')throw new Error('Invalid appearance response');
 const v=value as Record<string,unknown>;
 if(!Number.isSafeInteger(v.version)||Number(v.version)<0||(v.appearance!==null&&!isAppearance(v.appearance)))throw new Error('Invalid appearance response');
 return {appearance:v.appearance as Appearance|null,version:Number(v.version)};
}

export const customColorKeys=['background','primary','secondary','button','navigation','accent'] as const;
export type CustomColorKey=typeof customColorKeys[number];
export type CustomColors=Record<CustomColorKey,string>;
export function isHexColor(value:unknown):value is string{return typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);}
export function isCustomColors(value:unknown):value is CustomColors{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const keys=Object.keys(value);return keys.length===6&&keys.every(k=>(customColorKeys as readonly string[]).includes(k))&&customColorKeys.every(k=>isHexColor((value as Record<string,unknown>)[k]));
}
/** Return only supported fields; never persist user/role or arbitrary CSS properties. */
export function canonicalAppearance(value:Appearance):Appearance{
 return {mode:value.mode,palette:value.palette,...value.custom?{custom:Object.fromEntries(customColorKeys.map(k=>[k,value.custom![k].toLowerCase()])) as CustomColors}:{}};
}
export function parseOwnedAppearanceResponse(value:unknown):{appearance:Appearance|null;version:number;ownerId:string}{
 const data=parseAppearanceResponse(value),ownerId=(value as Record<string,unknown>).ownerId;
 if(typeof ownerId!=='string'||!ownerId||ownerId.length>512)throw new Error('Missing authenticated appearance owner');
 return {...data,ownerId};
}

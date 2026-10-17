export const palettes=[
 {id:'red',he:'אדום',en:'Red',button:'#cf2434',light:'#ae1b2c',dark:'#ff8991',softLight:'#fff0f1',softDark:'#321b22'},
 {id:'blue',he:'כחול',en:'Blue',button:'#1d4ed8',light:'#1d4ed8',dark:'#93b4ff',softLight:'#edf3ff',softDark:'#182747'},
 {id:'pink',he:'ורוד',en:'Pink',button:'#be185d',light:'#be185d',dark:'#ff9dcb',softLight:'#fff0f7',softDark:'#361d2c'},
 {id:'green',he:'ירוק',en:'Green',button:'#147d43',light:'#146c3b',dark:'#80dbac',softLight:'#edf9f1',softDark:'#182e25'},
 {id:'purple',he:'סגול',en:'Purple',button:'#7e22ce',light:'#7e22ce',dark:'#d2a7ff',softLight:'#f6efff',softDark:'#2b2040'},
 {id:'orange',he:'כתום',en:'Orange',button:'#b54708',light:'#a33e08',dark:'#ffb77c',softLight:'#fff3e8',softDark:'#36251b'},
 {id:'teal',he:'טורקיז',en:'Teal',button:'#0f766e',light:'#0f766e',dark:'#74dbd0',softLight:'#eaf9f7',softDark:'#17302f'},
] as const;
export type Palette=typeof palettes[number]['id'];
export type Appearance={mode:'light'|'dark';palette:Palette};
export const defaultAppearance:Appearance={mode:'dark',palette:'red'};
export function isPalette(value:unknown):value is Palette{return palettes.some(p=>p.id===value);}
export function isAppearance(value:unknown):value is Appearance{
 if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;
 return (v.mode==='light'||v.mode==='dark')&&isPalette(v.palette);
}
export const PALETTE_STORAGE_KEY='doctorcoach-palette';
export function parseAppearanceResponse(value:unknown):{appearance:Appearance|null;version:number}{
 if(!value||typeof value!=='object')throw new Error('Invalid appearance response');
 const v=value as Record<string,unknown>;
 if(!Number.isSafeInteger(v.version)||Number(v.version)<0||(v.appearance!==null&&!isAppearance(v.appearance)))throw new Error('Invalid appearance response');
 return {appearance:v.appearance as Appearance|null,version:Number(v.version)};
}

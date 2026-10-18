export const colorThemes = [
  {id:'dark',label:'כהה קלאסי',canvas:'#0c0c10',card:'#19191f',raised:'#222229',text:'#f5f5f7',muted:'#b1b1bd',line:'#656575',action:'#b91c2d',onAction:'#ffffff',accent:'#ff9ca5',soft:'#321b22'},
  {id:'light',label:'בהיר קלאסי',canvas:'#f5f6f8',card:'#ffffff',raised:'#e9edf3',text:'#172033',muted:'#475569',line:'#69788e',action:'#b91c2d',onAction:'#ffffff',accent:'#a51427',soft:'#ffe4e8'},
  {id:'ocean',label:'כחול ים',canvas:'#102e58',card:'#173d70',raised:'#204a80',text:'#f5f9ff',muted:'#c4d8f5',line:'#8aaddb',action:'#c2ddff',onAction:'#102e58',accent:'#c2ddff',soft:'#24518a'},
  {id:'violet',label:'סגול',canvas:'#35204f',card:'#492d69',raised:'#59387b',text:'#fff7ff',muted:'#e1ccef',line:'#b79acd',action:'#ebd2ff',onAction:'#35204f',accent:'#ebd2ff',soft:'#634185'},
  {id:'ruby',label:'אדום יין',canvas:'#511c2b',card:'#68283b',raised:'#7b3348',text:'#fff5f6',muted:'#f2cbd3',line:'#d697a7',action:'#ffdae1',onAction:'#511c2b',accent:'#ffdae1',soft:'#81364e'},
  {id:'sunshine',label:'צהוב שמש',canvas:'#fff1b8',card:'#fff9df',raised:'#f7df88',text:'#362708',muted:'#65501d',line:'#90712c',action:'#664700',onAction:'#ffffff',accent:'#664700',soft:'#f2d36a'},
  {id:'forest',label:'ירוק יער',canvas:'#113b31',card:'#194d41',raised:'#235f51',text:'#f1fff8',muted:'#c1e4d3',line:'#83b9a2',action:'#c3f5d9',onAction:'#113b31',accent:'#c3f5d9',soft:'#2c6a59'},
] as const;
export type ColorThemeId = typeof colorThemes[number]['id'];
export function findColorTheme(id: string | undefined) { return colorThemes.find(t=>t.id===id) ?? colorThemes[0]; }

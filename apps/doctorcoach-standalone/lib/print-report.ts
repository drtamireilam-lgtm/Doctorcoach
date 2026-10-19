export type PrintSection={title:string;rows:{label:string;value:string}[]};
export function reportHtml(title:string,sections:PrintSection[],language:'he'|'en',generatedAt:string){
 const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
 return `<!doctype html><html lang="${language}" dir="${language==='he'?'rtl':'ltr'}"><head><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:15px Arial,sans-serif;line-height:1.7;padding:24px;color:#111}h1{font-size:24px}h2{font-size:18px;margin-top:24px}table{border-collapse:collapse;width:100%}td,th{padding:8px;text-align:start;border-bottom:1px solid #ccc}section{break-inside:avoid}button{padding:10px}@media print{button{display:none}body{padding:0}@page{size:A4;margin:18mm}}</style></head><body><h1>${escape(title)}</h1><p>DoctorCoach · ${escape(generatedAt)}</p><button onclick="window.print()">${language==='he'?'הדפסה / שמירה כ־PDF':'Print / Save as PDF'}</button>${sections.map(s=>`<section><h2>${escape(s.title)}</h2><table>${s.rows.map(r=>`<tr><th>${escape(r.label)}</th><td>${escape(r.value)}</td></tr>`).join('')}</table></section>`).join('')}</body></html>`;
}
export function printReport(title:string,sections:PrintSection[],language:'he'|'en',generatedAt=new Date().toLocaleString(language==='he'?'he-IL':'en-GB')){
 const popup=window.open('','_blank');if(!popup)return false;popup.opener=null;
 popup.document.open();popup.document.write(reportHtml(title,sections,language,generatedAt));popup.document.close();popup.focus();return true;
}

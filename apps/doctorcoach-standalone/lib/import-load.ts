import {toKg,type LoadMetadata} from './load-units.ts';
export const parseMassUnit=(raw:string):'kg'|'lb'|undefined=>/^(kg|kgs|kilograms?|ק[״"']?ג|קילוגרם)$/i.test(raw.trim())?'kg':/^(lb|lbs|pounds?|פאונד|ליברות)$/i.test(raw.trim())?'lb':undefined;
export function importLoadUnit(raw:string,unitText=''):'kg'|'lb'{
 const specified=unitText.trim()?parseMassUnit(unitText):undefined;if(unitText.trim()&&!specified)throw new Error('יחידת משקל: בחרו kg או lb.');
 const embedded=raw.match(/\b(?:kg|kgs|kilograms?|lb|lbs|pounds?)\b|ק[״"']?ג|קילוגרם|פאונד|ליברות/gi)??[];const units=[...new Set(embedded.map(parseMassUnit))];
 if(units.length>1||specified&&units.length&&specified!==units[0])throw new Error('יחידת משקל: סתירה בין התא לעמודת היחידות.');
 return specified??units[0]??'kg';
}
export function parseImportLoad(raw:string,unitText='',basisText='',notes=''):{weight:number;load?:LoadMetadata;weightUnspecified:boolean}{
 const sourceUnit=importLoadUnit(raw,unitText);const embeddedSide=/per[ -]?side|each side|לכל צד/i.test(raw+' '+notes);
 const basis=basisText.trim();if(basis&&!/^(total|כולל|per-side|per side|לכל צד)$/i.test(basis))throw new Error('אופן מדידת המשקל: בחרו עומס כולל או לכל צד.');
 if(embeddedSide&&/^(total|כולל)$/i.test(basis))throw new Error('אופן מדידת המשקל: המקור מציין לכל צד, אך נבחר עומס כולל.');
 if(/\b\d{1,3},\d{3}\b/.test(raw))throw new Error('משקל: הפסיק עשוי לציין אלפים או שבר. הזינו ערך עשרוני מפורש עם נקודה.');
 const value=raw.replace(/\b(?:kg|kgs|kilograms?|lb|lbs|pounds?)\b|ק[״"']?ג|קילוגרם|פאונד|ליברות/gi,'').replace(/per[ -]?side|each side|לכל צד/gi,'').trim().replace(',','.');
 if(!raw.trim())return {weight:0,weightUnspecified:true};
 if(!/^\d+(?:\.\d+)?$/.test(value))throw new Error('משקל: יש להזין מספר תקין, למשל 92.5.');
 const sourceValue=Number(value),weight=toKg(sourceValue,sourceUnit);if(!Number.isFinite(weight)||weight>1000)throw new Error('משקל: הערך מחוץ לטווח המותר.');
 return {weight,weightUnspecified:false,load:{sourceValue,sourceUnit,basis:embeddedSide||/per[ -]?side|לכל צד/i.test(basis)?'per-side':'total'}};
}

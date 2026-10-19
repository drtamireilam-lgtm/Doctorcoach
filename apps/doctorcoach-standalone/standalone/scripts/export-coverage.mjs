// Inventory coverage only: never reads rows, exports data, or certifies a backup.
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export function exportCoverage(requiredTables,observedTables,projection={}){
 for(const values of [requiredTables,observedTables])if(!Array.isArray(values)||!values.length||values.some(v=>typeof v!=='string'||!v)||new Set(values).size!==values.length)throw new Error('Exact non-empty unique table inventories required');
 const observed=new Set(observedTables),required=new Set(requiredTables);
 const missing=requiredTables.filter(v=>!observed.has(v)).sort(),unexpected=observedTables.filter(v=>!required.has(v)).sort();
 const bounded=projection.truncated===true||['omitted_tables','omitted_rows','omitted_columns','truncated_values'].some(k=>Number(projection[k]??0)>0);
 return {inventoryComplete:!bounded&&!missing.length&&!unexpected.length,backupVerified:false,requiredCount:requiredTables.length,observedCount:observedTables.length,missing,unexpected,bounded};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const [requiredPath,observedPath]=process.argv.slice(2);if(!requiredPath||!observedPath)throw Error();
  const required=JSON.parse(await readFile(requiredPath,'utf8')),observed=JSON.parse(await readFile(observedPath,'utf8'));
  const result=exportCoverage(required.tables,observed.tables,observed.model_projection);console.log(JSON.stringify(result));process.exitCode=result.inventoryComplete?0:2;
 }catch{console.error('Could not verify inventory coverage. No backup certified.');process.exitCode=2;}
}

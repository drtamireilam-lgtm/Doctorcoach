// Curated synthetic examples, not a population accuracy estimate or real workbook.
import {recognitionCases} from '../tests/fixtures/smart-import-31-recognition.mjs';
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
const rows=[...recognitionCases].map(([name,expected])=>{
 const result=matchExerciseForImport(name,undefined,{allowGeneralMovement:true});
 return {name,expected,actual:result.exerciseId,status:result.status,outcome:result.exerciseId?(result.exerciseId===expected?'correctAutomatic':'incorrectAutomatic'):'manualReview'};
});
const counts=rows.reduce((out,row)=>(out[row.outcome]++,out),{correctAutomatic:0,incorrectAutomatic:0,manualReview:0});
console.log(JSON.stringify({fixture:'24 synthetic reviewed names; generic bench alias regression included',total:rows.length,...counts,rows},null,2));

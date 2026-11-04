// Local synthetic performance observation; no timing assertions or remote calls.
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
const query='Dumbbel bench press',options={allowGeneralMovement:true};
const memoryBefore=process.memoryUsage(),start=performance.now();
const cold=matchExerciseForImport(query,undefined,options),coldMs=performance.now()-start;
const warm=performance.now();for(let i=0;i<100;i++)matchExerciseForImport(query,undefined,options);
console.log(JSON.stringify({fixture:'synthetic repeated misspelling; review only',coldMs,warmQueries:100,warmMs:performance.now()-warm,status:cold.status,automaticallyMatched:!!cold.exerciseId,memoryBefore,memoryAfter:process.memoryUsage()},null,2));

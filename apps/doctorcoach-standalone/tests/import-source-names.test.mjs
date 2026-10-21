import test from 'node:test';import assert from 'node:assert/strict';
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
test('verified source spelling variants retain equipment and posture',()=>{
 for(const [name,id] of [['Dumbell flat press','bench'],['flat machine press','machine-chest-press'],['machine flys','chest-fly'],['rear delt flys machine','reverse-pec-deck'],['dumbbell shoulder press sitted','seated-db-shoulder-press'],['lateral raise dumbbells','lateral-raise'],['קירוב רגליים בישיבה במכונה','adduction'],['סקוואט בסמת\'','smith-squat']])assert.equal(matchExerciseForImport(name).exerciseId,id,name);
 for(const name of ['Legs 1','Legs 2','incline machine press','מתח רחב או pulldown','יד קדמית אני צריכה שני תרגילים'])assert.equal(matchExerciseForImport(name).exerciseId,'',name);
});

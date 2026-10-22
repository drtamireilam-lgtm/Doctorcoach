'use client';
import {AnatomyModelViewer} from './anatomy-model-viewer';
import {anatomyModels} from '../lib/anatomy-models';
/** Backwards-compatible shoulder entry point used by the isolated preview. */
export function AnatomyShoulderViewer(props:{language:'he'|'en';onExercise:(id:string)=>void;onMuscle:(slug:string)=>void}){
 return <AnatomyModelViewer model={anatomyModels[1]} {...props}/>;
}

import type {AtlasStructure} from './anatomy-models';
export type MuscleDepth='superficial'|'deep';
/** A source-defined layer filter; never infer depth from a mesh's shape or name. */
export function anatomyHiddenStructures(structures:readonly AtlasStructure[],hidden:ReadonlySet<string>,depths:ReadonlySet<MuscleDepth>,side:'both'|'left'|'right'){
 const result=new Set(hidden);
 for(const s of structures)if(s.depth&&!depths.has(s.depth)||side!=='both'&&s.side!==side&&s.side!=='midline')result.add(s.id);
 return result;
}

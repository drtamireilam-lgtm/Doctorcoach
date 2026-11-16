import areas from './prepared/detailed-areas.json' with {type:'json'};
import type {AtlasStructure} from './anatomy-models';
export const anatomyNavigationAreas=areas;
export function navigationHidden(structures:readonly AtlasStructure[],hidden:ReadonlySet<string>,area:string){
 const next=new Set(hidden);if(area==='all')return next;
 // Unknown navigation input must never hide every structure.
 if(!areas.some(a=>a.id===area))return next;
 for(const structure of structures)if(structure.navigationArea!==area)next.add(structure.id);
 return next;
}

type MuscleRegion={id:string;muscleSlugs:string[]};
export function muscleRegionId(slug:string,preferred:string,regions:MuscleRegion[]):string|null{
 const matches=regions.filter(region=>region.muscleSlugs.includes(slug));
 return matches.find(region=>region.id===preferred)?.id??matches[0]?.id??null;
}

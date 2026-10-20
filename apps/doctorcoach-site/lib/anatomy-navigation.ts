type MuscleRegion={id:string;muscleSlugs:string[]};
export function muscleRegionId(slug:string,preferred:string,regions:MuscleRegion[]):string|null{
 const matches=regions.filter(region=>region.muscleSlugs.includes(slug));
 return matches.find(region=>region.id===preferred)?.id??matches[0]?.id??null;
}

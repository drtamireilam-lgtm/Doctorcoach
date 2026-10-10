import type {WellnessRecord} from './wellness.ts';
// Include the episode so separate injuries at the same region never share a curve.
export function rehabMeasurementKey(r:WellnessRecord){
 return JSON.stringify([r.data.episodeId??'',r.data.side,r.data.motion,r.data.response]);
}
export function rehabMeasurementLabel(r:WellnessRecord,episodes:WellnessRecord[]){
 const episode=episodes.find(e=>e.kind==='episode'&&e.id===r.data.episodeId);
 return `${r.data.side} · ${r.data.motion} · ${r.data.response} · ${episode?.data.label??'ללא קישור לפציעה'}`;
}
export function filterRehabMeasurements(records:WellnessRecord[],region:string,episode='all'){
 return records.filter(r=>r.kind==='rehab'&&r.data.region===region&&(episode==='all'||(episode==='unassigned'?!r.data.episodeId:r.data.episodeId===episode)));
}
export function latestEpisodeMeasurement(records:WellnessRecord[],episode:WellnessRecord){
 if(episode.kind!=='episode')return undefined;
 return records.filter(r=>r.kind==='rehab'&&r.data.episodeId===episode.id&&r.data.region===episode.data.region&&r.data.side===episode.data.side)
  .sort((a,b)=>b.day.localeCompare(a.day)||b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id))[0];
}

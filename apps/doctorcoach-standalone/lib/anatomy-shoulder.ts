import manifest from './prepared/shoulder-model.json' with {type:'json'};
export type AnatomyLayer = 'bone' | 'muscle';
export type ShoulderStructure = {id:string; en:string; he:string; layer:AnatomyLayer; side:string};
export const shoulderAsset=manifest;
export const shoulderStructures=manifest.structures as ShoulderStructure[];
export function pickStructure(materialName:string,visible:ReadonlySet<AnatomyLayer>):string|null {
 const structure=shoulderStructures.find(s=>s.id===materialName);
 return structure&&visible.has(structure.layer)?structure.id:null;
}
export function materialState(structure:ShoulderStructure,selected:string|null,visible:ReadonlySet<AnatomyLayer>){
 const color:number[]=structure.id===selected?[.12,.65,1,1]:structure.layer==='bone'?[.88,.84,.71,1]:[.65,.18,.25,1];
 if(!visible.has(structure.layer))color[3]=0;
 return {color};
}

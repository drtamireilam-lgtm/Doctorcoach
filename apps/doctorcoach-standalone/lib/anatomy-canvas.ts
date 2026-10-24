import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {anatomyModels,decodeAnatomyAsset,validateAnatomyAsset,visibleStructureIds,readCameraState,type AnatomyModel,type AtlasLayer,type CameraState} from './anatomy-models';
export type AnatomyCamera='front'|'back'|'left'|'right';
/** A single owned scene. Render only on changes; stop listeners and free all GPU resources. */
export async function createAnatomyCanvas(host:HTMLElement,onSelect:(id:string|null)=>void,signal:AbortSignal,options:{model?:AnatomyModel;camera?:CameraState|null;onCameraChange?:(state:CameraState)=>void}={}){
 const modelSpec=options.model??anatomyModels[1];
 const response=await fetch(modelSpec.src,{signal});
 if(!response.ok)throw new Error('Model request failed');
 const bytes=await decodeAnatomyAsset(await response.arrayBuffer(),modelSpec,signal);
 await validateAnatomyAsset(bytes,modelSpec);
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 const gltf=await new GLTFLoader().parseAsync(bytes,'');
 const model=gltf.scene;const meshes:THREE.Mesh[]=[];
 model.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
 const releaseModel=()=>{for(const mesh of meshes){mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();}};
 if(signal.aborted){releaseModel();throw new DOMException('Aborted','AbortError');}
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch(cause){releaseModel();throw cause;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.add(model);scene.add(new THREE.HemisphereLight(0xffffff,0x52617a,2.5));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,3,4);scene.add(light);
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 model.position.sub(center);model.updateMatrixWorld(true);const radius=Math.max(size.x,size.y,size.z)*1.8;
 const aspect=Math.max(host.clientWidth,1)/Math.max(host.clientHeight,1);
 const camera=new THREE.PerspectiveCamera(35,aspect,.001,Math.max(10,radius*10));
 const presetTarget=new THREE.Vector3();let presetDistance=radius;
 const framing=modelSpec.initialFocus,anchor=framing&&meshes.find(m=>m.name===framing.structure);
 if(anchor&&framing&&Number.isFinite(framing.scale)&&framing.scale>0){
  const bounds=new THREE.Box3().setFromObject(anchor);bounds.getCenter(presetTarget);
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.min(aspect,1));
  presetDistance=bounds.getSize(new THREE.Vector3()).length()/2*framing.scale/Math.sin(halfFov);
 }
 const initialPositions={front:[0,0,presetDistance],back:[0,0,-presetDistance],left:[presetDistance,0,0],right:[-presetDistance,0,0]};
 camera.position.fromArray(initialPositions[modelSpec.initialView??'front']).add(presetTarget);const controls=new OrbitControls(camera,renderer.domElement);
 controls.target.copy(presetTarget);controls.update();
 controls.enablePan=false;controls.enableDamping=false;controls.minDistance=radius*(modelSpec.overview ? .3 : .03);controls.maxDistance=radius*3;
 // OrbitControls owns pinch/wheel; one-finger vertical movement remains page scrolling.
 renderer.domElement.style.touchAction='pan-y';
 renderer.domElement.setAttribute('aria-label',modelSpec.en);renderer.domElement.setAttribute('role','img');
 host.appendChild(renderer.domElement);let disposed=false;
 const render=()=>{if(!disposed)renderer.render(scene,camera);};controls.addEventListener('change',render);
 const snapshot=():CameraState=>({position:camera.position.toArray() as [number,number,number],target:controls.target.toArray() as [number,number,number]});
 const remember=()=>options.onCameraChange?.(snapshot());controls.addEventListener('end',remember);
 const restored=readCameraState(options.camera);if(restored){camera.position.fromArray(restored.position);controls.target.fromArray(restored.target);controls.update();}
 const resize=()=>{const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let gesture=false;
 const pointerDown=(event:PointerEvent)=>{pointers.add(event.pointerId);if(pointers.size>1){gesture=true;down=null;}else {gesture=false;down={x:event.clientX,y:event.clientY};}};
 const raycaster=new THREE.Raycaster();
 const pointerUp=(event:PointerEvent)=>{pointers.delete(event.pointerId);const point=down;down=null;if(gesture||!point||Math.hypot(event.clientX-point.x,event.clientY-point.y)>6)return;const bounds=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const hit=raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0];onSelect(hit?.object.name??null);};
 const cancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);down=null;};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();controls.removeEventListener('change',render);controls.removeEventListener('end',remember);controls.dispose();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);releaseModel();renderer.dispose();renderer.forceContextLoss();canvas.remove();signal.removeEventListener('abort',dispose);}
 signal.addEventListener('abort',dispose,{once:true});
 return {dispose,snapshot,focus(id:string){
  const mesh=meshes.find(m=>m.name===id&&m.visible);if(!mesh)return;
  const bounds=new THREE.Box3().setFromObject(mesh),target=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3());
  const direction=camera.position.clone().sub(controls.target).normalize();
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.min(camera.aspect,1));
  const distance=Math.max(extent.length()/2/Math.sin(halfFov)*1.1,controls.minDistance*1.1);
  controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);controls.update();render();remember();
 },pan(horizontal:number,vertical:number){
  const distance=-camera.position.distanceTo(controls.target)*.12;
  const offset=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(horizontal*distance)
   .addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1),vertical*distance);
  camera.position.add(offset);controls.target.add(offset);controls.update();render();remember();
 },setView(view:AnatomyCamera){const positions={front:[0,0,presetDistance],back:[0,0,-presetDistance],left:[presetDistance,0,0],right:[-presetDistance,0,0]};camera.position.fromArray(positions[view]).add(presetTarget);controls.target.copy(presetTarget);controls.update();render();remember();},update(selected:string|null,visible:ReadonlySet<AtlasLayer>,isolated:string|null=null,hidden:ReadonlySet<string>=new Set()){
  const shown=new Set(visibleStructureIds(modelSpec,visible,isolated,hidden));
  for(const mesh of meshes){const structure=modelSpec.structures.find(s=>s.id===mesh.name);if(!structure)continue;mesh.visible=shown.has(structure.id);
   const color=structure.id===selected?[.12,.65,1]:structure.layer==='bone'?[.88,.84,.71]:(structure.layer==='surface'||structure.layer==='cartilage')?[.32,.46,.59]:[.65,.18,.25];
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial)material.color.setRGB(color[0],color[1],color[2],THREE.LinearSRGBColorSpace);
  }render();}};
}

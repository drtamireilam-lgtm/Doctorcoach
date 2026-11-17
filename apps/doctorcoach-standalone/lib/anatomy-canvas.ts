import {exerciseMaterialRole} from './anatomy-training';
import type {PainPoint} from './anatomy-pain';
import type {AnatomyExerciseRole} from './anatomy-exercises';
import * as THREE from 'three';
import {prepareAnatomyMaterials,anatomyColor,lightAnatomyScene} from './anatomy-presentation';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {anatomyModels,decodeAnatomyAsset,validateAnatomyAsset,visibleStructureIds,readCameraState,type AnatomyModel,type AtlasLayer,type CameraState} from './anatomy-models';
import {createExerciseRig} from './anatomy-motion-rig';
import type {ExerciseMotionProfile,MotionMode} from './anatomy-exercise-motion';
import {createJointRig} from './anatomy-joint-rig';
import type {JointMovement,JointSide} from './anatomy-joint-movements';
import type {JointScope} from './anatomy-joint-context';
export type AnatomyCamera='front'|'back'|'left'|'right';
export class AnatomyRendererUnavailable extends Error {
 constructor(cause:unknown){super('Anatomy rendering is unavailable',{cause});}
}
/** A single owned scene. Render only on changes; stop listeners and free all GPU resources. */
export async function createAnatomyCanvas(host:HTMLElement,onSelect:(id:string|null)=>void,signal:AbortSignal,options:{model?:AnatomyModel;onPainPick?:(point:PainPoint,placement:'surface'|'centre',view:AnatomyCamera)=>void;camera?:CameraState|null;onCameraChange?:(state:CameraState)=>void;onAnchor?:(point:{x:number;y:number;width:number;height:number;obscured:boolean}|null)=>void;onHover?:(id:string|null)=>void;motion?:ExerciseMotionProfile;jointMotion?:{movement:JointMovement;side:JointSide}}={}){
 const modelSpec=options.model??anatomyModels[1];
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch(cause){throw new AnatomyRendererUnavailable(cause);}
 const releaseRenderer=()=>{renderer.dispose();renderer.forceContextLoss();};
 const meshes:THREE.Mesh[]=[];
 const releaseModel=()=>{for(const mesh of meshes){mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();}};
 let model:THREE.Object3D;
 let rig:ReturnType<typeof createExerciseRig>|undefined;
 let jointRig:ReturnType<typeof createJointRig>|undefined;
 try{
  const response=await fetch(modelSpec.src,{signal});
  if(!response.ok)throw new Error('Model request failed');
  const bytes=await decodeAnatomyAsset(await response.arrayBuffer(),modelSpec,signal);
  await validateAnatomyAsset(bytes,modelSpec);
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const gltf=await new GLTFLoader().parseAsync(bytes,'');
  model=gltf.scene;
  model.traverse(object=>{if(object instanceof THREE.Mesh)meshes.push(object);});
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  prepareAnatomyMaterials(meshes,new Map(modelSpec.structures.map(s=>[s.id,s.layer])));
  if(options.motion&&options.jointMotion)throw new Error('Only one motion adapter per scene');
  if(options.motion)rig=createExerciseRig(model,meshes,modelSpec,options.motion);
  if(options.jointMotion){jointRig=createJointRig(model,meshes,modelSpec);jointRig.configure(options.jointMotion.movement,options.jointMotion.side);}
 }catch(cause){
  rig?.dispose();jointRig?.dispose();releaseModel();releaseRenderer();throw cause;
 }
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 const scene=new THREE.Scene();scene.add(model);
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 model.position.sub(center);model.updateMatrixWorld(true);const radius=Math.max(size.x,size.y,size.z)*1.8;
 lightAnatomyScene(scene,new THREE.Vector3(),size);
 const modelBounds=new THREE.Box3().setFromObject(model),modelSize=modelBounds.getSize(new THREE.Vector3());
 const marker=new THREE.Mesh(new THREE.SphereGeometry(Math.max(size.y*.006,.003),12,8),new THREE.MeshBasicMaterial({color:'#ffd166',depthTest:false}));marker.visible=false;marker.renderOrder=20;scene.add(marker);
 const painView=():AnatomyCamera=>{const d=camera.position.clone().sub(controls.target);return Math.abs(d.x)>Math.abs(d.z)?d.x>0?'left':'right':d.z>0?'front':'back';};
 const normalizedPoint=(id:string,point:THREE.Vector3):PainPoint=>{const p=point.clone().sub(modelBounds.min).divide(modelSize);return {structureId:id,x:THREE.MathUtils.clamp(p.x,0,1),y:THREE.MathUtils.clamp(p.y,0,1),z:THREE.MathUtils.clamp(p.z,0,1)};};
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
 let selectedId:string|null=null,hoverId:string|null=null;
 let pickedAnchor:{id:string;point:THREE.Vector3}|null=null;
 function projectAnchor(){
  if(!options.onAnchor)return;
  const mesh=meshes.find(m=>m.name===(selectedId??hoverId)&&m.visible);
  if(!mesh){options.onAnchor?.(null);return;}
  const world=pickedAnchor?.id===mesh.name?pickedAnchor.point.clone():new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  const projected=world.clone().project(camera),width=host.clientWidth,height=host.clientHeight;
  const direction=world.clone().sub(camera.position),distance=direction.length();
  const probe=new THREE.Raycaster(camera.position,direction.normalize());
  const hit=probe.intersectObjects(meshes.filter(m=>m.visible),false)[0];
  options.onAnchor?.({x:(projected.x+1)*width/2,y:(1-projected.y)*height/2,width,height,obscured:projected.z<-1||projected.z>1||!!hit&&hit.object!==mesh&&hit.distance<distance});
 }
 const render=()=>{if(!disposed){renderer.render(scene,camera);projectAnchor();if(jointRig)renderer.domElement.dataset.jointTriangles=String(renderer.info.render.triangles);}};controls.addEventListener('change',render);
 const snapshot=():CameraState=>({position:camera.position.toArray() as [number,number,number],target:controls.target.toArray() as [number,number,number]});
 const remember=()=>options.onCameraChange?.(snapshot());controls.addEventListener('end',remember);
 const restored=readCameraState(options.camera);if(restored){camera.position.fromArray(restored.position);controls.target.fromArray(restored.target);controls.update();}
 const resize=()=>{const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let gesture=false;
 const pointerDown=(event:PointerEvent)=>{pointers.add(event.pointerId);if(pointers.size>1){gesture=true;down=null;}else {gesture=false;down={x:event.clientX,y:event.clientY};}};
 const raycaster=new THREE.Raycaster();
 if(options.motion||options.jointMotion)raycaster.layers.enable(1);
 const pointerUp=(event:PointerEvent)=>{pointers.delete(event.pointerId);const point=down;down=null;if(gesture||!point||Math.hypot(event.clientX-point.x,event.clientY-point.y)>6)return;const bounds=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const hit=raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0];pickedAnchor=hit?{id:hit.object.name,point:hit.point.clone()}:null;onSelect(hit?.object.name??null);if(hit)options.onPainPick?.(normalizedPoint(hit.object.name,hit.point),'surface',painView());};
 const cancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);down=null;};
 let hoverAt=0;
 const hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||pointers.size||!options.onHover||event.timeStamp-hoverAt<80)return;hoverAt=event.timeStamp;const bounds=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const id=raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0]?.object.name??null;if(id&&id!==hoverId){hoverId=id;options.onHover(id);projectAnchor();}};
 const leave=(event:PointerEvent)=>{if(event.relatedTarget instanceof Element&&event.relatedTarget.closest('.anatomy-annotation-card'))return;hoverId=null;options.onHover?.(null);projectAnchor();};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('pointermove',hover);canvas.addEventListener('pointerleave',leave);
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();controls.removeEventListener('change',render);controls.removeEventListener('end',remember);controls.dispose();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointermove',hover);canvas.removeEventListener('pointerleave',leave);rig?.dispose();jointRig?.dispose();marker.geometry.dispose();marker.material.dispose();releaseModel();releaseRenderer();canvas.remove();signal.removeEventListener('abort',dispose);}
 signal.addEventListener('abort',dispose,{once:true});
 function focusIds(ids:readonly string[],visibleOnly=true){
  const wanted=new Set(ids),targets=meshes.filter(m=>wanted.has(m.name)&&(!visibleOnly||m.visible));if(!targets.length)return;
  model.updateMatrixWorld(true);const bounds=new THREE.Box3();for(const mesh of targets)bounds.expandByObject(mesh);const target=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3());
  const direction=camera.position.clone().sub(controls.target).normalize();
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.min(camera.aspect,1));
  const distance=Math.max(extent.length()/2/Math.sin(halfFov)*1.1,controls.minDistance*1.1);
  controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);controls.update();render();remember();
 }
 return {dispose,snapshot,setPainMarker(point:PainPoint|null){marker.visible=!!point;renderer.domElement.dataset.painMarker=point?'visible':'hidden';if(point)marker.position.set(point.x,point.y,point.z).multiply(modelSize).add(modelBounds.min);render();},placePainAtStructure(id:string){const mesh=meshes.find(m=>m.name===id&&m.visible);if(mesh)options.onPainPick?.(normalizedPoint(id,new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())),'centre',painView());},setJointMovement(movement:JointMovement,side:JointSide){jointRig?.configure(movement,side);render();},setJointScope(scope:JointScope){if(jointRig?.setScope(scope))render();},focusJointContext(){if(jointRig)focusIds(jointRig.contextIds(),false);},setJointPose(phase:number,reference=false,bones=true,muscles=false){jointRig?.pose(phase,reference,bones,muscles);render();},setJointNeutral(bones=true,muscles=false,movement?:JointMovement,side:JointSide='both'){jointRig?.neutral(bones,muscles,movement,side);render();},setExercisePose(degrees:number,mode:MotionMode,bones=true,muscles=true,selectedMuscle:string|null=null){rig?.pose(degrees,mode,bones,muscles,selectedMuscle);render();},focus(id:string){focusIds([id]);},focusStructures(ids:readonly string[]){focusIds(ids,false);},pan(horizontal:number,vertical:number){
  const distance=-camera.position.distanceTo(controls.target)*.12;
  const offset=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(horizontal*distance)
   .addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1),vertical*distance);
  camera.position.add(offset);controls.target.add(offset);controls.update();render();remember();
 },zoom(factor:number){if(!Number.isFinite(factor)||factor<=0)return;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();render();remember();},setView(view:AnatomyCamera,preserveFrame=false){const local=preserveFrame||jointRig?.getScope()==='joint',distance=local?camera.position.distanceTo(controls.target):presetDistance,target=local?controls.target.clone():presetTarget;const positions={front:[0,0,distance],back:[0,0,-distance],left:[distance,0,0],right:[-distance,0,0]};camera.position.fromArray(positions[view]).add(target);controls.target.copy(target);controls.update();render();remember();},update(selected:string|null,visible:ReadonlySet<AtlasLayer>,isolated:string|null=null,hidden:ReadonlySet<string>=new Set(),roles:ReadonlyMap<string,AnatomyExerciseRole>=new Map()){
  selectedId=selected;
  if(!selected){hoverId=null;pickedAnchor=null;}
  const shown=new Set(visibleStructureIds(modelSpec,visible,isolated,hidden));
  for(const mesh of meshes){const structure=modelSpec.structures.find(s=>s.id===mesh.name);if(!structure)continue;mesh.visible=shown.has(structure.id);
   const paint=exerciseMaterialRole(roles.get(structure.id),structure.id===selected),color=anatomyColor(structure.layer,paint.selectedBase);
   for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial){material.color.set(modelSpec.id==='detailed'?'#ffffff':color);material.emissive.set(paint.emissive);material.emissiveIntensity=paint.intensity;}
  }render();}};
}

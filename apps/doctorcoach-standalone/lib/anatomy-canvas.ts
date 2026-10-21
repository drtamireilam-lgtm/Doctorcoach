import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {shoulderAsset,shoulderStructures,materialState,type AnatomyLayer} from './anatomy-shoulder';
import {inspectGlb} from './anatomy-glb-inventory';
export type AnatomyCamera='front'|'back'|'left'|'right';
/** A single owned scene. Render only on changes; stop listeners and free all GPU resources. */
export async function createAnatomyCanvas(host:HTMLElement,onSelect:(id:string|null)=>void,signal:AbortSignal){
 const response=await fetch('/anatomy/shoulder.glb',{signal});
 if(!response.ok)throw new Error('Model request failed');
 const bytes=await response.arrayBuffer();if(bytes.byteLength>3*1024*1024)throw new Error('Model exceeds budget');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 if(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')!==shoulderAsset.glbSha256)throw new Error('Model checksum mismatch');
 const inventory=inspectGlb(bytes);const expected=new Set(shoulderStructures.map(s=>s.id));
 if(inventory.meshNodeNames.length!==expected.size||new Set(inventory.meshNodeNames).size!==expected.size||inventory.meshNodeNames.some(n=>!expected.has(n)))throw new Error('Unexpected shoulder mesh inventory');
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
 model.position.sub(center);const radius=Math.max(size.x,size.y,size.z)*1.8;
 const camera=new THREE.PerspectiveCamera(35,1,.001,Math.max(10,radius*10));
 camera.position.set(0,0,radius);const controls=new OrbitControls(camera,renderer.domElement);
 controls.enablePan=false;controls.enableDamping=false;controls.minDistance=radius*.3;controls.maxDistance=radius*3;
 // OrbitControls owns pinch/wheel; one-finger vertical movement remains page scrolling.
 renderer.domElement.style.touchAction='pan-y';
 renderer.domElement.setAttribute('aria-label','Interactive right shoulder');renderer.domElement.setAttribute('role','img');
 host.appendChild(renderer.domElement);let disposed=false;
 const render=()=>{if(!disposed)renderer.render(scene,camera);};controls.addEventListener('change',render);
 const resize=()=>{const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let gesture=false;
 const pointerDown=(event:PointerEvent)=>{pointers.add(event.pointerId);if(pointers.size>1){gesture=true;down=null;}else {gesture=false;down={x:event.clientX,y:event.clientY};}};
 const raycaster=new THREE.Raycaster();
 const pointerUp=(event:PointerEvent)=>{pointers.delete(event.pointerId);const point=down;down=null;if(gesture||!point||Math.hypot(event.clientX-point.x,event.clientY-point.y)>6)return;const bounds=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const hit=raycaster.intersectObjects(meshes.filter(m=>m.visible),false)[0];onSelect(hit?.object.name??null);};
 const cancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);down=null;};
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancel);
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();controls.removeEventListener('change',render);controls.dispose();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);releaseModel();renderer.dispose();renderer.forceContextLoss();canvas.remove();signal.removeEventListener('abort',dispose);}
 signal.addEventListener('abort',dispose,{once:true});
 return {dispose,setView(view:AnatomyCamera){const positions={front:[0,0,radius],back:[0,0,-radius],left:[radius,0,0],right:[-radius,0,0]};camera.position.fromArray(positions[view]);controls.target.set(0,0,0);controls.update();render();},update(selected:string|null,visible:ReadonlySet<AnatomyLayer>){for(const mesh of meshes){const structure=shoulderStructures.find(s=>s.id===mesh.name);if(!structure)continue;mesh.visible=visible.has(structure.layer);const color=materialState(structure,selected,visible).color;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material instanceof THREE.MeshStandardMaterial){material.color.setRGB(color[0],color[1],color[2],THREE.LinearSRGBColorSpace);}}render();}};
}

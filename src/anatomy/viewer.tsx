import React,{useEffect,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {abductionAngle,muscles,type Muscle} from './data';
import {nextZoomDistance,isSelectionClick} from './interaction';
function ContextWatch({onFailure}:{onFailure:()=>void}){const {gl}=useThree();useEffect(()=>{const canvas=gl.domElement;const lost=(event:Event)=>{event.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onFailure]);return null;}
function Controls({view, zoom}: {view: number; zoom: number}) {
 const {camera, gl, invalidate} = useThree();
 const controls = useRef<OrbitControls | null>(null);
 const previousZoom = useRef(zoom);
 useEffect(() => {
   const c = new OrbitControls(camera, gl.domElement);
   c.target.set(0, .2, 0); c.enablePan = false; c.minDistance = 3; c.maxDistance = 10;
   const redraw = () => invalidate();
   c.addEventListener('change', redraw); controls.current = c; c.update();
   return () => { c.removeEventListener('change', redraw); c.dispose(); controls.current = null; };
 }, [camera, gl, invalidate]);
 useEffect(() => {
   const target = new Vector3(0, .2, 0);
   const distance = camera.position.distanceTo(target);
   camera.position.copy(target).add(new Vector3(0, .3, view % 2 === 0 ? 5.8 : -5.8).setLength(distance));
   controls.current?.update(); invalidate();
 }, [view, camera, invalidate]);
 useEffect(() => {
   const direction = zoom - previousZoom.current;
   previousZoom.current = zoom;
   if (!direction) return;
   const target = new Vector3(0, .2, 0);
   const distance = nextZoomDistance(camera.position.distanceTo(target), direction);
   camera.position.sub(target).setLength(distance).add(target);
   controls.current?.update(); invalidate();
 }, [zoom, camera, invalidate]);
 return null;
}
function Part({m,side,selected,onSelect,active}: {m:Muscle; side:number; selected:string; onSelect:(id:string)=>void; active:boolean}) {
 const [x,y,z]=m.position; const arm=['biceps-brachii','triceps-brachii'].includes(m.id);
 return <mesh name={`${m.id}-${side===1?'left':'right'}`} position={[side*x,y-(arm ? .95 : 0),z]} scale={m.scale as [number,number,number]} onClick={e=>{e.stopPropagation();if(isSelectionClick(e.delta))onSelect(m.id);}}>
 <sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={selected===m.id?'#ffd166':active?'#fb7185':m.layer==='deep'?'#8f79ca':'#ba404f'} roughness={.6} metalness={.05}/></mesh>;
}
function Body({selected,onSelect,layers,playing,reset}: {selected:string; onSelect:(id:string)=>void; layers:Record<string,boolean>; playing:boolean; reset:number}) {
 const left=useRef<Group>(null),right=useRef<Group>(null),elapsed=useRef(0); const {invalidate}=useThree();
 useEffect(()=>{elapsed.current=0; if(left.current)left.current.rotation.z=0;if(right.current)right.current.rotation.z=0;invalidate();},[reset,invalidate]);
 useFrame((_,dt)=>{if(!playing)return; elapsed.current+=Math.min(dt,.05); const a=abductionAngle(elapsed.current); if(left.current)left.current.rotation.z=a; if(right.current)right.current.rotation.z=-a; invalidate();});
 useEffect(()=>{invalidate();},[playing,invalidate]);
 const shown=muscles.filter(m=>layers[m.layer]); const moving=(m:Muscle)=>['biceps-brachii','triceps-brachii'].includes(m.id);
 return <group>
 {layers.frame && <group><mesh position={[0,.1,-.03]} scale={[.83,1.05,.26]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#45566a" transparent opacity={.35}/></mesh><mesh position={[0,1.53,0]} scale={[.28,.35,.26]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#a7b4bc"/></mesh><mesh position={[0,1.12,0]} scale={[.15,.22,.15]}><sphereGeometry/><meshStandardMaterial color="#a7b4bc"/></mesh></group>}
 {[-1,1].map(side=><React.Fragment key={side}>
 {shown.filter(m=>!moving(m)).map(m=><Part key={m.id} m={m} side={side} selected={selected} onSelect={onSelect} active={playing&&['deltoid-middle','supraspinatus','trapezius'].includes(m.id)}/>)}
 <group ref={side===1?left:right} position={[side*1.07,.95,0]}>
 {layers.frame&&<><mesh position={[side*.1,-.62,0]} scale={[.11,.65,.11]}><sphereGeometry/><meshStandardMaterial color="#acbbc6"/></mesh><mesh position={[side*.12,-1.55,0]} scale={[.1,.45,.1]}><sphereGeometry/><meshStandardMaterial color="#acbbc6"/></mesh></>}
 {shown.filter(moving).map(m=><group key={m.id} position={[-side*1.07,0,0]}><Part m={m} side={side} selected={selected} onSelect={onSelect} active={false}/></group>)}
 </group></React.Fragment>)}
 </group>;
}

export default function AnatomyViewer({view,zoom,selected,onSelect,layers,playing,reset,onFailure,failure}:{view:number;zoom:number;selected:string;onSelect:(id:string)=>void;layers:Record<string,boolean>;playing:boolean;reset:number;onFailure:()=>void;failure:string}){
 return <Canvas frameloop="demand" dpr={[1,1.5]} gl={{powerPreference:'low-power'}} camera={{position:[0,.5,5.8],fov:43}} fallback={<p>{failure}</p>}><ContextWatch onFailure={onFailure}/><color attach="background" args={['#101923']}/><ambientLight intensity={1.5}/><directionalLight position={[3,5,5]} intensity={3}/><directionalLight position={[-3,2,-4]} intensity={2}/><Controls view={view} zoom={zoom}/><Body selected={selected} onSelect={onSelect} layers={layers} playing={playing} reset={reset}/></Canvas>;
}

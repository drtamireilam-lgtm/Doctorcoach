import React, { Component, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { abductionAngle, muscles, relatedExercises, type Muscle } from './data';
import './style.css';

function Controls({view, zoom}: {view: number; zoom: number}) {
 const {camera, gl, invalidate} = useThree();
 const controls = useRef<OrbitControls | null>(null);
 useEffect(() => {const c = new OrbitControls(camera,gl.domElement); c.target.set(0,.2,0); c.enablePan=false; c.minDistance=3; c.maxDistance=10; c.addEventListener('change',()=>invalidate()); controls.current=c; c.update(); return () => {c.dispose(); controls.current=null;};},[camera,gl,invalidate]);
 useEffect(() => {camera.position.set(0,.5,view % 2 === 0 ? 5.8 : -5.8); controls.current?.update(); invalidate();},[view,camera,invalidate]);
 useEffect(() => {const target=new Vector3(0,.2,0); camera.position.sub(target).setLength(Math.max(3,Math.min(10,5.8-zoom*.5))).add(target); controls.current?.update(); invalidate();},[zoom,camera,invalidate]);
 return null;
}
function Part({m,side,selected,onSelect,active}: {m:Muscle; side:number; selected:string; onSelect:(id:string)=>void; active:boolean}) {
 const [x,y,z]=m.position; const arm=['biceps-brachii','triceps-brachii'].includes(m.id);
 return <mesh name={`${m.id}-${side===1?'left':'right'}`} position={[side*x,y-(arm?.95:0),z]} scale={m.scale as [number,number,number]} onClick={e=>{e.stopPropagation();onSelect(m.id);}}>
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
class ViewerBoundary extends Component<{children:React.ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<p role="alert">תצוגת WebGL אינה זמינה. אפשר לבחור שרירים ברשימה ולקרוא את המידע.</p>:this.props.children;}}
function App(){
 const [selected,setSelected]=useState(()=>decodeURIComponent(location.hash.slice(1))||'pectoralis-major');
 const [layers,setLayers]=useState<Record<string,boolean>>({superficial:true,deep:false,frame:true}); const [view,setView]=useState(0),[zoom,setZoom]=useState(0),[playing,setPlaying]=useState(false),[reset,setReset]=useState(0);
 useEffect(()=>{const f=()=>setSelected(decodeURIComponent(location.hash.slice(1)));addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f);},[]);
 const select=(id:string)=>{setSelected(id);history.pushState(null,'',`#${id}`);const m=muscles.find(x=>x.id===id);if(m)setLayers(l=>({...l,[m.layer]:true}));};
 const muscle=muscles.find(m=>m.id===selected);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>{if(q.matches)setPlaying(false);};q.addEventListener('change',f);return()=>q.removeEventListener('change',f);},[]);
 return <main><header><span>DOCTOR<span className="red">COACH</span> / LAB</span><span>אנטומיה בתלת־ממד · אבטיפוס פנימי</span></header><h1>לחקור. לבחור. להבין תנועה.</h1><p className="warning" role="note">מודל סכמטי מקורי — לא מאומת להוראה רפואית. צורות, חיבורים ותנועה אינם שחזור אנטומי או ביומכני מדויק.</p>
 <div className="layout"><section className="viewer" aria-label="מודל אנטומיה"><div className="toolbar"><button onClick={()=>setView(v=>v%2===0?v+2:v+1)}>מבט קדמי</button><button onClick={()=>setView(v=>v%2===1?v+2:v+1)}>מבט אחורי</button><button aria-label="הגדלה" onClick={()=>setZoom(z=>Math.min(5,z+1))}>＋</button><button aria-label="הקטנה" onClick={()=>setZoom(z=>Math.max(-8,z-1))}>−</button></div>
 <div className="canvas"><ViewerBoundary><Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,.5,5.8],fov:43}} fallback={<p>WebGL אינו זמין; השתמשו ברשימת השרירים.</p>}><color attach="background" args={['#101923']}/><ambientLight intensity={1.5}/><directionalLight position={[3,5,5]} intensity={3}/><directionalLight position={[-3,2,-4]} intensity={2}/><Controls view={view} zoom={zoom}/><Body selected={selected} onSelect={select} layers={layers} playing={playing} reset={reset}/></Canvas></ViewerBoundary></div>
 <p>גרירה לסיבוב 360° · גלילה / צביטה להגדלה · לחיצה לבחירה</p><fieldset><legend>שכבות</legend>{[['superficial','שטחית'],['deep','עמוקה'],['frame','מסגרת גוף']].map(([key,label])=><label key={key}><input type="checkbox" checked={layers[key]} onChange={e=>setLayers(l=>({...l,[key]:e.target.checked}))}/>{label}</label>)}</fieldset>
 <div className="animation"><strong>הרחקת כתף · הדגמה סכמטית 0–90°</strong><button onClick={()=>setPlaying(p=>!p)}>{playing?'עצירה':'הפעלה / המשך'}</button><button onClick={()=>{setPlaying(false);setReset(r=>r+1);}}>איפוס</button><p>הדגשת דלתא אמצעית, על־קוצי וטרפז היא סימון תפקיד בלבד. אין מדידת פעילות. תנועת שכמה, עצם הבריח, serratus anterior והתארכות השרירים טרם מודלו.</p></div></section>
 <aside><nav aria-label="בחירת שריר"><h2>פלג גוף עליון</h2><div className="muscles">{muscles.map(m=><button key={m.id} aria-pressed={selected===m.id} onClick={()=>select(m.id)}>{m.he}<small lang="en">{m.en}</small></button>)}</div></nav></aside>
 <article id="muscle-information" aria-live="polite">{muscle?<><span className="red">DRAFT / מידע לבדיקה מקצועית</span><h2>{muscle.he}</h2><h3 lang="en">{muscle.en}</h3><p>{muscle.simple}</p><dl>{(['location','origin','insertion','innervation','actions'] as const).map(k=><React.Fragment key={k}><dt>{k==='location'?'מיקום אנטומי':k}</dt><dd dir="ltr">{muscle[k]}</dd></React.Fragment>)}</dl><h3>למאמנים</h3><p dir="ltr">{muscle.professional}</p><h3>קשרים לתרגילים — טיוטה</h3>{relatedExercises(muscle.id).map(l=><p key={l.exerciseId}>{l.exercise.name} · {l.role}</p>)}{!relatedExercises(muscle.id).length&&<p>טרם הוגדרו קשרים לשריר זה.</p>}<p className="muted">ההדמיה הפעילה משמאל מדגישה את השריר. מזהה: {muscle.id}. מידע תמציתי; אימות רפואי מתועד עדיין ממתין.</p></>:<p>בחרו שריר מהרשימה.</p>}</article></div></main>;
}
createRoot(document.getElementById('anatomy-root')!).render(<App/>);

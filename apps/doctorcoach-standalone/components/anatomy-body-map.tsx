'use client';
import {useState} from 'react';
import {anatomyLabels,regionNames,type AnatomyLanguage,type AnatomySide,type AnatomyView} from '../lib/anatomy-learning';
import {regions} from '../lib/anatomy';
// Original vector navigation geometry. Regions are deliberately schematic; no atlas/model is copied.
const shapes=[
 {id:'cervical_neck',path:'M132 64 L148 64 L148 90 L126 90Z'},
 {id:'shoulder',path:'M112 88 Q88 86 76 116 L96 128 L116 112Z'},
 {id:'elbow',path:'M78 145 L95 151 L88 181 L68 176Z'},
 {id:'forearm',path:'M68 180 L88 184 L73 224 L55 216Z'},
 {id:'wrist_hand',path:'M53 218 L73 228 L64 263 L44 257Z'},
 {id:'chest',path:'M115 92 L148 94 L148 137 L108 132Z',front:true},
 {id:'upper_back_scapula',path:'M115 92 L148 94 L148 137 L108 132Z',back:true},
 {id:'core_abdomen',path:'M111 138 L148 142 L148 204 L116 200Z',front:true},
 {id:'lower_back_spine',path:'M112 140 L148 142 L148 201 L116 198Z',back:true},
 {id:'groin',path:'M116 203 L148 208 L148 235 L121 246Z',front:true},
 {id:'hip_glute',path:'M116 203 L148 208 L148 239 L120 246Z',back:true},
 {id:'thigh',path:'M118 249 L146 243 L143 314 L117 313Z'},
 {id:'knee',path:'M117 316 L143 317 L142 340 L115 338Z'},
 {id:'lower_leg',path:'M115 343 L141 344 L136 407 L120 408Z'},
 {id:'ankle_foot',path:'M119 412 L137 412 L141 441 L112 441Z'},
];
export function AnatomyBodyMap({language,region,side,view,onRegion,onSide,onView}:{language:AnatomyLanguage;region:string;side:AnatomySide;view:AnatomyView;onRegion:(id:string,side?:AnatomySide)=>void;onSide:(side:AnatomySide)=>void;onView:(view:AnatomyView)=>void}){
 const t=anatomyLabels[language];const [zoom,setZoom]=useState(1);
 const label=(id:string)=>language==='en'?regionNames[id]:regions.find(r=>r.id===id)?.label;
 return <section className="panel anatomy-atlas-map" aria-label={t.map}>
  <div className="atlas-switch" role="group" aria-label={t.map}>{(['front','back'] as const).map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>onView(v)}>{t[v]}</button>)}</div>
  <div className="atlas-switch" role="group" aria-label={t.side}>{(['both','right','left'] as const).map(s=><button type="button" key={s} aria-pressed={side===s} onClick={()=>onSide(s)}>{t[s]}</button>)}</div>
  <label className="atlas-zoom">{t.zoom}<input aria-label={t.zoom} type="range" min="1" max="1.7" step="0.1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button type="button" onClick={()=>setZoom(1)}>{t.reset}</button></label>
  <div className="atlas-map-scroll" tabIndex={0} aria-label={t.zoom}>
   <svg viewBox="0 0 300 460" width={300*zoom} height={460*zoom} aria-label={t.map} role="group">
    <title>{view==='front'?t.front:t.back}</title><ellipse cx="150" cy="38" rx="25" ry="30" className="atlas-frame"/>
    <path className="atlas-frame" d="M132 65 L126 86 Q91 84 77 112 L63 168 L44 222 L40 260 L62 267 L77 225 L97 183 L109 144 L112 200 L107 237 L112 319 L111 342 L116 411 L108 443 L141 443 L148 340 L150 251 L152 340 L159 443 L192 443 L184 411 L189 342 L188 319 L193 237 L188 200 L191 144 L203 183 L223 225 L238 267 L260 260 L256 222 L237 168 L223 112 Q209 84 174 86 L168 65Z"/>
    <path d="M150 94V241" className="atlas-midline"/>
    {(['right','left'] as const).map(bodySide=>{
     // In a front view the patient's right is the viewer's left; reverse for posterior view.
     const mirror=(bodySide==='left')===(view==='front');
     return <g key={bodySide} transform={mirror?'translate(300 0) scale(-1 1)':undefined} opacity={side!=='both'&&side!==bodySide?0.28:1}>
      {shapes.filter(s=>(!s.front||view==='front')&&(!s.back||view==='back')).map(s=><path key={s.id} d={s.path} className={'atlas-region '+(region===s.id&&(side==='both'||side===bodySide)?'active':'')} role="button" tabIndex={side==='both'||side===bodySide?0:-1} aria-label={label(s.id)+' — '+t[bodySide]} aria-pressed={region===s.id&&(side==='both'||side===bodySide)} onClick={()=>{onRegion(s.id,bodySide);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRegion(s.id,bodySide);}}}><title>{label(s.id)+' — '+t[bodySide]}</title></path>)}
     </g>;
    })}
   </svg>
  </div>
  <p className="care-muted">{t.mapNote}</p><p aria-live="polite"><strong>{t.selection}: </strong>{label(region)} · {t[side]}</p>
 </section>;
}

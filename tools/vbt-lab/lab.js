'use strict';
const $=id=>document.getElementById(id);
const video=$('video'),canvas=$('overlay'),ctx=canvas.getContext('2d');
let token='',rules=null,source=null,url='',track=null,report=null,selection=null,drag=null,busy=false;
let anchorTime=0,anchorFrame=null,segments=[],correctionFrame=null,correctionTime=null,visibleTime=0,reviewPlayback=false;
const ready=Promise.all([fetch('/session').then(r=>r.json()),fetch('/rules').then(r=>r.json())]).then(([s,r])=>{token=s.token;rules=r;renderCommands();});
async function api(route,body,headers={}){await ready;const r=await fetch(route,{method:'POST',headers:{'X-Lab-Token':token,...headers},body});const out=await r.json();if(!r.ok)throw Error(out.error||'Analysis failed');return out;}
function status(text){$('track-status').textContent=text;}
function invalidate(){track=null;report=null;$('metres').value='';$('pixels').value='';$('plane').checked=false;$('reviewed').checked=false;$('reviewed').disabled=true;$('analyze').disabled=true;$('download').disabled=true;$('results').textContent='';}
function busyState(value){busy=value;for(const id of ['source','consent','x','y','w','h','reviewed','metres','pixels','pixel-error','plane','selection-mode','point-size','back-frame','next-frame','zoom','end-time','set-end','clear-end'])$(id).disabled=value; $('reviewed').disabled=value||!track?.samples.length;$('track').disabled=value||!source;$('analyze').disabled=value||!track;$('play-track').disabled=value||!track?.samples.length;$('correct').disabled=value||correctionFrame===null;$('download-labels').disabled=value||!segments.length;}
function readBox(){return ['x','y','w','h'].map(id=>Number($(id).value));}
function draw(){
 if(!video.videoWidth)return;
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 let box=selection;
 if(reviewPlayback&&track?.failure_time!==null&&track?.failure_time!==undefined&&video.currentTime>=track.failure_time){video.pause();reviewPlayback=false;video.currentTime=track.failure_time;status('המעקב נעצר. לחצו על תיקון וסמנו שוב את אותו חלק של המוט.');}
 if(reviewPlayback&&track?.end_time!==null&&track?.end_time!==undefined&&video.currentTime>=track.end_time){video.pause();reviewPlayback=false;video.currentTime=track.end_time;status('הקטע שנבחר הסתיים. זה אינו אישור איכות מעקב או תקינות הרמה.');}
 if(track?.samples.length){let index=0;for(let i=0;i<track.samples.length;i++){if(track.samples[i].t<=video.currentTime)index=i;else break;}box=track.boxes[index];
 if(video.currentTime<track.samples[0].t-.001||video.currentTime>track.samples[track.samples.length-1].t+.05||(track.failure_time!==null&&video.currentTime>=track.failure_time-.001)){ctx.fillStyle='#ff596a';ctx.font='22px sans-serif';ctx.fillText('TRACK NOT AVAILABLE',12,30);return;}}
 if(box){ctx.strokeStyle=track?'#65dbba':'#ffda80';ctx.lineWidth=Math.max(2,canvas.width/400);ctx.strokeRect(box.x,box.y,box.w,box.h);const cx=box.x+box.w/2,cy=box.y+box.h/2;ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.moveTo(cx-12,cy);ctx.lineTo(cx+12,cy);ctx.moveTo(cx,cy-12);ctx.lineTo(cx,cy+12);ctx.stroke();}
}
// Place overlay over the actual letterboxed image; native playback controls remain outside.
function layout(){if(!video.videoWidth)return;const stage=video.parentElement;stage.style.aspectRatio=`${video.videoWidth}/${video.videoHeight}`;canvas.style.height='100%';draw();}
function coord(e){const r=video.getBoundingClientRect();return {x:Math.max(0,Math.min(video.videoWidth-1,(e.clientX-r.left)/r.width*video.videoWidth)),y:Math.max(0,Math.min(video.videoHeight-1,(e.clientY-r.top)/r.height*video.videoHeight))};}
function setSelection(box){selection=box;$('edge-warning').textContent=box.x<8||box.y<8||box.x+box.w>video.videoWidth-8||box.y+box.h>video.videoHeight-8?'האזור קרוב לשולי התמונה. אם קצה המוט יוצא מהצילום, בחרו אזור ברור יותר על הפלטה או סיימו את הקטע לפני היציאה.':'';['x','y','w','h'].forEach(id=>$(id).value=box[id]);draw();}
function markPoint(p){const n=Math.max(16,Math.min(160,Number($('point-size').value)||40,video.videoWidth,video.videoHeight));const w=Math.round(n),h=w;setSelection({x:Math.max(0,Math.min(video.videoWidth-w,Math.round(p.x-w/2))),y:Math.max(0,Math.min(video.videoHeight-h,Math.round(p.y-h/2))),w,h});}
function anchor(){anchorTime=visibleTime&&Math.abs(visibleTime-video.currentTime)<.05?visibleTime:video.currentTime;anchorFrame=correctionFrame!==null&&Math.abs(anchorTime-correctionTime)<.025?correctionFrame:null;$('anchor-status').textContent=`נקודת התחלה: ${anchorTime.toFixed(3)} שנ׳ · גררו את הסמן לדיוק ואז לחצו על מעקב.`;}
canvas.addEventListener('pointerdown',e=>{if(busy||!source||!video.videoWidth||video.seeking)return;e.preventDefault();video.pause();reviewPlayback=false;invalidate();anchor();drag=coord(e);canvas.setPointerCapture(e.pointerId);if($('selection-mode').value==='point')markPoint(drag);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=coord(e);if($('selection-mode').value==='point')markPoint(p);else setSelection({x:Math.round(Math.min(p.x,drag.x)),y:Math.round(Math.min(p.y,drag.y)),w:Math.max(8,Math.round(Math.abs(p.x-drag.x))),h:Math.max(8,Math.round(Math.abs(p.y-drag.y)))});});
canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta||busy||!selection)return;e.preventDefault();video.pause();invalidate();anchor();setSelection({...selection,x:Math.max(0,Math.min(video.videoWidth-selection.w,selection.x+delta[0])),y:Math.max(0,Math.min(video.videoHeight-selection.h,selection.y+delta[1]))});});
const endDrag=()=>{drag=null;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
$('set-end').addEventListener('click',()=>{if(busy||!source)return;video.pause();$('end-time').value=video.currentTime.toFixed(3);invalidate();status('סיום הקטע נקבע. הריצו מעקב מחדש.');});
$('clear-end').addEventListener('click',()=>{$('end-time').value='';invalidate();status('סיום הקטע בוטל. הריצו מעקב מחדש.');});
$('end-time').addEventListener('input',()=>invalidate());
$('zoom').addEventListener('change',()=>{video.parentElement.style.width=`${Number($('zoom').value)*100}%`;layout();});
for(const [id,step] of [['back-frame',-1],['next-frame',1]])$(id).addEventListener('click',()=>{video.pause();reviewPlayback=false;video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+step/30));$('anchor-status').textContent='הזזה בקירוב של 1/30 שנייה; סמנו את המוט בפריים המוצג.';});
$('play-track').addEventListener('click',()=>{if(!track?.samples.length)return;video.currentTime=track.samples[0].t;reviewPlayback=true;video.play().catch(e=>status(e.message));});
$('correct').addEventListener('click',()=>{if(correctionFrame===null)return;video.pause();reviewPlayback=false;video.currentTime=correctionTime;invalidate();selection=null;anchorFrame=correctionFrame;anchorTime=correctionTime;status('סמנו שוב את אותו קצה מוט בפריים העצירה, ואז לחצו על מעקב.');draw();busyState(false);});
function saveJSON(value,name){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('download-labels').addEventListener('click',()=>{if(segments.length)saveJSON({schema:'dc-vbt-manual-segments-1',validated:false,segments,warning:'Independent candidate segments; no interpolation or velocity across manual restarts.'},'DoctorCoach-VBT-markings.json');});
for(const id of ['x','y','w','h'])$(id).addEventListener('input',()=>{invalidate();anchor();const [x,y,w,h]=readBox();selection={x,y,w,h};draw();});
$('source').addEventListener('change',()=>{if(busy)return;source=$('source').files[0]||null;if(url)URL.revokeObjectURL(url);invalidate();selection=null;segments=[];anchorTime=0;anchorFrame=null;correctionFrame=null;correctionTime=null;reviewPlayback=false;visibleTime=0;$('end-time').value='';$('edge-warning').textContent='';$('anchor-status').textContent='בחרו נקודה על המוט.';video.parentElement.style.width='100%';$('zoom').value='1';if(source){url=URL.createObjectURL(source);video.src=url;}busyState(false);status('');});
video.addEventListener('loadedmetadata',layout);video.addEventListener('timeupdate',draw);video.addEventListener('seeked',draw);window.addEventListener('resize',layout);
if(video.requestVideoFrameCallback){const tick=(_,metadata)=>{visibleTime=metadata.mediaTime;draw();video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
$('track').addEventListener('click',async()=>{
 if(!source||busy)return;if(!$('consent').checked){status('נדרש אישור שימוש בסרטון.');return;}
 if(source.size>30*1024*1024||!Number.isFinite(video.duration)||video.duration>60){status('בחרו סרטון עד 30 MiB ועד 60 שניות.');return;}
 if(!selection){status('סמנו קודם נקודה על המוט.');return;}
 video.pause();invalidate();reviewPlayback=false;busyState(true);status('מכינים מסלול מקומי…');
 try{const roi=readBox();track=await api('/api/track',source,{'X-ROI':JSON.stringify(roi),'X-End-Time':$('end-time').value,'X-Start-Frame':String(anchorFrame??0),'X-Start-Time':String(anchorFrame===null?anchorTime:0),'X-Consent':'confirmed','Content-Type':'application/octet-stream'});
 status(`מצב: ${track.status} · ${track.samples.length} נקודות · תמיכת תנועה בהתאמה חלשה: ${track.flow_confirmed_frames??0} פריימים · מצלמה: ${track.camera_stable?'יציבה לפי סף ניסיוני':'לא אומתה'}`);
 correctionFrame=track.failure_frame;correctionTime=track.failure_time;segments.push({source_sha256:track.source_sha256,start_frame:track.start_frame,end_time:track.end_time,anchor_time:anchorTime,roi:track.roi,status:track.status,failure_frame:track.failure_frame,failure_time:track.failure_time,samples:track.samples,manual_anchor:true,algorithm:'roi-reference-flow-v3',flow_confirmed_frames:track.flow_confirmed_frames??0});
 $('reviewed').disabled=!track.samples.length;video.currentTime=track.samples[0]?.t??anchorTime;draw();}
 catch(e){status(e.message);}finally{busyState(false);}
});
for(const id of ['reviewed','metres','pixels','pixel-error','plane'])$(id).addEventListener('change',()=>{report=null;$('download').disabled=true;$('results').textContent='הקלט השתנה; יש להריץ ניתוח מחדש.';});
$('analyze').addEventListener('click',async()=>{
 if(!track||busy)return;busyState(true);
 try{const hasScale=$('metres').value!==''||$('pixels').value!=='';
 report=await api('/api/analyze',JSON.stringify({job:track.job,reviewed:$('reviewed').checked,calibration:hasScale?{metres:Number($('metres').value),pixels:Number($('pixels').value),error:Number($('pixel-error').value),same_plane:$('plane').checked,fixed_camera:$('plane').checked}:null}),{'Content-Type':'application/json'});
 $('results').replaceChildren();
 const title=document.createElement('p');title.textContent=`${report.repetitions.length} קטעים קונצנטריים מועמדים — לא ספירת חזרות מאומתת`;$('results').append(title);
 for(const [i,rep] of report.repetitions.entries()){const p=document.createElement('p');p.className='result';const m=rep.measurement;p.textContent=`קטע ${i+1}: ${rep.start_s.toFixed(2)}–${rep.end_s.toFixed(2)} שנ׳ · ${m.status}`+(m.mean_mps===null?' · מהירות מוסתרת':` · ${m.mean_mps.toFixed(3)} m/s · טווח הנחות ${m.bounds_mps.map(v=>v.toFixed(3)).join('–')}`);$('results').append(p);}
 if(report.track_status==='FLOW_ASSISTED_REVIEW_ONLY'){const p=document.createElement('p');p.textContent='מסלול עם תמיכת תנועה מיועד לצפייה ולתיוג בלבד; מהירות מוסתרת עד לאימות נפרד.';$('results').append(p);}
 $('download').disabled=false;}
 catch(e){$('results').textContent=e.message;}finally{busyState(false);}
});
$('download').addEventListener('click',()=>{if(!report)return;const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='DoctorCoach-VBT-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
const labels={start_upright_knees_locked:'עמידת התחלה ונעילת ברכיים',hip_below_knee:'מפרק ירך מתחת לחלק העליון של הברך',single_descent:'ניסיון ירידה יחיד',no_downward_reversal:'ללא תנועה חוזרת כלפי מטה',finish_upright_knees_locked:'עמידת סיום ונעילת ברכיים',feet_legal:'מיקום ותנועת רגליים מותרים',no_assistance:'ללא סיוע',rack_controlled:'החזרה מבוקרת למתקן',start_elbows_locked:'מרפקים נעולים בהתחלה',head_shoulders_butt_contact:'ראש כתפיים וישבן במגע עם הספסל',feet_flat:'כפות רגליים שטוחות על הרצפה',legal_grip:'אחיזה חוקית',chest_or_abdominal_contact:'מגע בחזה או בבטן',no_belt_contact:'ללא מגע בחגורה',both_elbows_at_or_below_shoulders:'עומק שני המרפקים ביחס לכתפיים',bar_motionless_at_bottom:'מוט ללא תנועה בתחתית',no_heave_or_body_thrust:'ללא הקפצה שקיעה או תנופת גוף',no_bar_downward_reversal:'ללא ירידת המוט במהלך הלחיצה',finish_elbows_locked:'מרפקים נעולים בסיום',finish_knees_locked:'ברכיים נעולות בסיום',finish_erect_deltoids_behind_bar:'עמידה זקופה ומיקום כתפיים',no_thigh_support:'ללא תמיכה בירכיים',both_hands_control_descent:'שליטה בירידה בשתי הידיים'};
function stopVoice(){window.speechSynthesis?.cancel();}
function renderCommands(){
 stopVoice();$('commands').replaceChildren();$('criteria').replaceChildren();$('judge').disabled=true;$('judgment').textContent='';
 if(!rules||$('mode').value==='training')return;
 for(const name of rules.commands[$('lift').value]){const b=document.createElement('button');b.textContent=name;b.type='button';b.addEventListener('click',()=>{if(!$('voice').checked)return;stopVoice();if(!window.speechSynthesis){$('judgment').textContent='קול אינו נתמך בדפדפן הזה.';return;}const utterance=new SpeechSynthesisUtterance(name);utterance.lang='en-US';window.speechSynthesis.speak(utterance);});$('commands').append(b);}
}
$('lift').addEventListener('change',renderCommands);$('mode').addEventListener('change',renderCommands);$('voice').addEventListener('change',stopVoice);$('mute').addEventListener('click',stopVoice);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});window.addEventListener('pagehide',stopVoice);
$('checklist').addEventListener('click',()=>{
 if(!rules||$('mode').value==='training'){$('judgment').textContent='אימון רגיל: ללא שיפוט.';return;}
 $('criteria').replaceChildren();const lift=$('lift').value;
 for(const key of rules.criteria[lift]){const label=document.createElement('label');label.textContent=labels[key]||key;const select=document.createElement('select');select.dataset.criterion=key;for(const [v,t] of [['unknown','לא ניתן לקבוע'],['true','נבדק ומתקיים'],['false','נבדק ואינו מתקיים']]){const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o);}label.append(select);$('criteria').append(label);}
 for(const [kind,keys] of [['command',rules.commands[lift]],['event',rules.events[lift]]])for(const key of keys){const label=document.createElement('label');label.textContent=`${kind}: ${key} — זמן במקור (שניות)`;const input=document.createElement('input');input.type='number';input.min='0';input.step='.01';input.dataset[kind]=key;label.append(input);$('criteria').append(label);}
 $('judge').disabled=false;
});
$('judge').addEventListener('click',async()=>{
 const criteria={};document.querySelectorAll('[data-criterion]').forEach(e=>criteria[e.dataset.criterion]=e.value==='unknown'?null:e.value==='true');
 const commands=[];document.querySelectorAll('[data-command]').forEach(e=>{if(e.value!=='')commands.push([e.dataset.command,Number(e.value)]);});
 const events={};document.querySelectorAll('[data-event]').forEach(e=>{if(e.value!=='')events[e.dataset.event]=Number(e.value);});
 try{const out=await api('/api/judge',JSON.stringify({lift:$('lift').value,mode:$('mode').value,reviewed:$('judge-reviewed').checked,criteria,commands,events}),{'Content-Type':'application/json'});$('judgment').textContent=`${out.status} · חסר: ${out.missing.join(', ')||'—'} · הפרות: ${out.violations.join(', ')||'—'} · אינו שיפוט רשמי או אוטומטי מאומת.`;}catch(e){$('judgment').textContent=e.message;}
});
$('effort-fit').addEventListener('click',async()=>{
 try{const file=$('effort-source').files[0];if(!file||file.size>24000)throw Error('בחרו קובץ JSON עד 24 KB.');const observations=JSON.parse(await file.text());const out=await api('/api/effort',JSON.stringify({observations,athlete:$('athlete').value,lift:$('lift').value,protocol:$('protocol').value,velocity_mps:$('effort-speed').value===''?null:Number($('effort-speed').value),reviewed:$('effort-reviewed').checked,maximal_intent:$('effort-reviewed').checked}),{'Content-Type':'application/json'});$('effort-results').textContent=JSON.stringify(out,null,2);}catch(e){$('effort-results').textContent=e.message;}
});

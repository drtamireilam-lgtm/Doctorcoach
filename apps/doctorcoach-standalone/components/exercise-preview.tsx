'use client';
import {useEffect,useRef,useState} from 'react';
import type {VideoAsset} from '../lib/media-store';
import {bundledExerciseDemos} from '../lib/bundled-exercise-demos';
import {programScopedId} from '../lib/import-source';
import {useCareResource} from '../hooks/use-care';

export const builtInDemos=new Map(bundledExerciseDemos.map(video=>[video.exerciseId,video]));

export function publishedDemos(videos:VideoAsset[]=[]){
 const result=new Map<string,VideoAsset>();
 for(const video of videos){
  if(video.kind==='demo'&&video.published&&video.status==='ready'&&!result.has(video.exerciseId))result.set(video.exerciseId,video);
 }
 return result;
}

function LinkedPreview({url,symbol}:{url:string;symbol:string}){
 const [src,setSrc]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  let link:URL;
  try{link=new URL(url);}catch{return;}
  const host=link.hostname.replace(/^www\./,'');
  if(host==='youtube.com'||host==='youtu.be'){
   const id=host==='youtu.be'?link.pathname.slice(1):link.searchParams.get('v')??link.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
   if(id&&/^[\w-]{11}$/.test(id))setSrc('https://i.ytimg.com/vi/'+id+'/hqdefault.jpg');
  }else if(host==='vimeo.com'){
   fetch('https://vimeo.com/api/oembed.json?url='+encodeURIComponent(url),{signal:controller.signal,referrerPolicy:'no-referrer'})
    .then(r=>r.ok?r.json():null).then(data=>{if(controller.signal.aborted||!data||typeof data!=='object'||!('thumbnail_url' in data))return;
     if(typeof data.thumbnail_url==='string'&&data.thumbnail_url.startsWith('https://'))setSrc(data.thumbnail_url);}).catch(()=>{});
  }
  return ()=>controller.abort();
 },[url]);
 return src?<img className="exercise-preview-frame" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setSrc('')}/>:<div className="exercise-symbol" aria-hidden="true">{symbol}</div>;
}

function UploadedFrame({video,symbol}:{video:VideoAsset;symbol:string}){
 const ref=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const node=ref.current;
  if(!node)return;
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
  });
  observer.observe(node);
  return ()=>observer.disconnect();
 },[]);
 return <div className="exercise-preview-frame" ref={ref}>{visible&&!failed?
  <video muted playsInline aria-hidden="true" preload="metadata" src={(video.playbackPath??'/api/media/'+encodeURIComponent(video.id))+'#t=0.1'} onLoadedMetadata={e=>{const player=e.currentTarget;if(Number.isFinite(player.duration)&&player.duration>0)player.currentTime=Math.min(.1,player.duration/2);}} onError={()=>setFailed(true)}/>:
  <div className="exercise-symbol" aria-hidden="true">{symbol}</div>}</div>;
}

export function ExercisePreview({video,linkedUrl,symbol}:{video?:VideoAsset;linkedUrl?:string;symbol:string}){
 if(video?.posterPath)return <img className="exercise-preview-frame" src={video.posterPath} alt="" loading="lazy" decoding="async"/>;
 if(video)return <UploadedFrame key={video.id} video={video} symbol={symbol}/>;
 if(linkedUrl)return <LinkedPreview key={linkedUrl} url={linkedUrl} symbol={symbol}/>;
 return <div className="exercise-symbol" aria-hidden="true">{symbol}</div>;
}

export function DetailPreview({exerciseId,symbol,linkedUrl}:{exerciseId:string;symbol:string;linkedUrl?:string}){
 if(programScopedId(exerciseId))return <ExercisePreview symbol={symbol}/>;
 const known=builtInDemos.get(exerciseId);
 if(known)return <ExercisePreview video={known} symbol={symbol}/>;
 return <AdditionalDetailPreview exerciseId={exerciseId} symbol={symbol} linkedUrl={linkedUrl}/>;
}
function AdditionalDetailPreview({exerciseId,symbol,linkedUrl}:{exerciseId:string;symbol:string;linkedUrl?:string}){
 const {data}=useCareResource<{videos:VideoAsset[]}>('/api/media?kind=demo');
 return <ExercisePreview video={publishedDemos(data?.videos).get(exerciseId)} linkedUrl={linkedUrl} symbol={symbol}/>;
}

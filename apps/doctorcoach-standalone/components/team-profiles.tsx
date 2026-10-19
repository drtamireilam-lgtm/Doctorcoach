'use client';
import {useEffect,useState} from 'react';
import {visibleTeamProfiles} from '../lib/team-profiles';
import type {TeamPhoto} from '../lib/team-photo-store';
import {useCareResource} from '../hooks/use-care';
import {useLanguage} from './language-provider';
export function TeamPortrait({photo,name,initials}:{photo?:TeamPhoto;name:string;initials:string}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[photo?.url]);
 return photo?.url&&!failed?<img className="team-portrait" src={photo.url} alt={name} loading="lazy" onError={()=>setFailed(true)}/>:<div className="team-portrait team-portrait-placeholder" aria-hidden="true">{initials}</div>;
}
export function TeamProfiles(){
 const photos=useCareResource<{photos:TeamPhoto[]}>('/api/team-photos'),english=useLanguage().language==='en';
 return <section className="team-grid" aria-label={english?'Our team':'הצוות שלנו'}>{visibleTeamProfiles.map(member=><article className="team-card" key={member.id}>
  <TeamPortrait photo={photos.data?.photos.find(photo=>photo.memberId===member.id)} name={english?member.nameEn:member.name} initials={member.id==='tamir'?'TE':member.id==='nadav'?'NR':'LZ'}/>
  <span>{english?member.titleEn:member.title}</span><h2>{english?member.nameEn:member.name}</h2><p>{english?member.bioEn:member.bio}</p>{member.id==='lior'&&<a className="button secondary" href="#consult">{english?'Nutrition consultations':'לפגישת תזונה או ייעוץ'}</a>}
 </article>)}</section>;
}

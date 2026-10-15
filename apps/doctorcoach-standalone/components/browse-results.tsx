'use client';
import {useRef,useState,type ReactNode} from 'react';
import {Localize,useLanguage} from './language-provider';
export function BrowseResults<T>({items,children}:{items:T[];children:(visible:T[])=>ReactNode}){
 const start=useRef<HTMLElement>(null);
 const [page,setPage]=useState(1),english=useLanguage().language==='en',pages=Math.max(1,Math.ceil(items.length/12)),current=Math.min(page,pages);
 function changePage(next:number){setPage(next);start.current?.focus({preventScroll:true});start.current?.scrollIntoView({block:'start',behavior:'auto'});}
 return <section className="browse-result-page" ref={start} tabIndex={-1} aria-label={english?'Search results':'תוצאות חיפוש'}><Localize>{children(items.slice((current-1)*12,current*12))}</Localize>{pages>1&&<nav className="browse-pages" aria-label={english?'Result pages':'עמודי תוצאות'}><button type="button" className="button secondary" disabled={current===1} onClick={()=>changePage(current-1)}>{english?'Previous':'הקודם'}</button><span role="status">{english?'Page':'עמוד'} {current} / {pages}</span><button type="button" className="button secondary" disabled={current===pages} onClick={()=>changePage(current+1)}>{english?'Next':'הבא'}</button></nav>}</section>;
}

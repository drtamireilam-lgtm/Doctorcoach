'use client';
import {useMemo} from 'react';
import {useLanguage} from './language-provider';
import {proposeImportAliases} from '../lib/import-alias-proposals';
import type {ImportMapping} from '../lib/import-mapping-types';

export function ImportAliasProposalExport({items,loading}:{items:ImportMapping[];loading:boolean}){
 const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const report=useMemo(()=>proposeImportAliases(items),[items]);
 // Personal memory is capped at 250 short names. A bounded data URL keeps the
 // download tied to the currently rendered report without a Blob lifecycle.
 const href=useMemo(()=>'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(report,null,2)+'\n'),[report]);
 if(loading||!report.proposals.length)return null;
 return <div className="panel"><p>{t('הצעות לכינויים מתוך ההתאמות האישיות ששמרתם','Alias proposals from your saved personal corrections')} · {report.proposals.length}</p><p className="care-muted">{t('הקובץ כולל שמות תרגילים ומזהי ספרייה בלבד. בדקו את השמות לפני שיתוף. ההורדה אינה משנה את המילון הכללי.','The file contains exercise names and catalog IDs only. Review the names before sharing. Downloading does not change the shared dictionary.')}</p><a className="button secondary" href={href} download="DoctorCoach-alias-proposals.json">{t('הורדת הצעות כינויים לבדיקה','Download alias proposals for review')}</a></div>;
}

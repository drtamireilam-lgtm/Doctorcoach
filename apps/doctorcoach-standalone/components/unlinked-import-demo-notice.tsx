'use client';
import {useLanguage} from './language-provider';
export function UnlinkedImportDemoNotice(){const he=useLanguage().language==='he';return <p className="care-muted" role="status" data-no-translate>{he?'תרגיל בשם המקורי, ללא שיוך לספרייה וללא סרטון הדגמה. המאמן יכול לשייך אותו לתרגיל מתאים בהמשך.':'Original-name exercise, not linked to the library and without a demonstration. Your coach can link it to the appropriate exercise later.'}</p>;}

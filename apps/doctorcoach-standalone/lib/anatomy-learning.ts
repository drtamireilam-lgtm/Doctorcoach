import cards from './prepared/anatomy-learning.json' with {type:'json'};
export type AnatomyLanguage='he'|'en';
export type AnatomySide='both'|'left'|'right';
export type AnatomyView='front'|'back';
export type Bilingual={he:string;en:string};
export type LearningCard={innervation?:Bilingual;slug:string;location:Bilingual;origin:Bilingual;insertion:Bilingual;action:Bilingual;joints:Bilingual;training:Bilingual;source:string;region:string;view:AnatomyView;links:{id:string;role:'primary'|'secondary'|'stabilizer'}[]};
export const learningCards=cards as LearningCard[];
export const learningCard=(slug:string)=>learningCards.find(card=>card.slug===slug);
export const exerciseMuscles=(id:string)=>learningCards.flatMap(card=>card.links.filter(link=>link.id===id).map(link=>({slug:card.slug,role:link.role})));
export function anatomyHash(state:{region:string;muscle?:string;side:AnatomySide;view:AnatomyView;search?:string}){
 const q=new URLSearchParams({region:state.region,side:state.side,view:state.view});
 if(state.muscle)q.set('muscle',state.muscle);
 if(state.search)q.set('q',state.search);
 return '#learn?'+q.toString();
}
export function readAnatomyHash(hash:string,regionIds:string[],muscleIds:string[]){
 const q=new URLSearchParams(hash.split('?')[1]??'');
 return {region:regionIds.includes(q.get('region')??'')?q.get('region')!:'shoulder',muscle:muscleIds.includes(q.get('muscle')??'')?q.get('muscle')!:undefined,side:(['both','left','right'].includes(q.get('side')??'')?q.get('side'):'both') as AnatomySide,view:(q.get('view')==='back'?'back':'front') as AnatomyView,search:q.get('q')?.slice(0,120)??''};
}
export function anatomyMatches(m:{name:string;en:string;slug:string},query:string){
 const normalize=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[-־–]/g,' ').replace(/\s+/g,' ').trim();
 return normalize(m.name+' '+m.en+' '+m.slug).includes(normalize(query));
}
export const regionNames:Record<string,string>={shoulder:'Shoulder',elbow:'Elbow / upper arm',forearm:'Forearm',thigh:'Thigh',knee:'Knee',lower_leg:'Lower leg',ankle_foot:'Ankle / foot',lower_back_spine:'Lumbar spine',hip_glute:'Hip / glutes',cervical_neck:'Neck / cervical spine',chest:'Chest',upper_back_scapula:'Upper back / thoracic spine',core_abdomen:'Abdomen / core',wrist_hand:'Wrist / hand',groin:'Pelvis / groin'};
export const anatomyLabels={
 he:{title:'מפת הגוף והשרירים',intro:'בחרו אזור בגוף, חפשו שריר ולמדו איך הוא משתתף בתנועה ובאימון.',search:'חיפוש שריר בעברית או באנגלית',region:'אזור בגוף',front:'מבט קדמי',back:'מבט אחורי',both:'שני הצדדים',left:'שמאל',right:'ימין',side:'צד בגוף',zoom:'הגדלה',reset:'איפוס',map:'מפת ניווט דו־ממדית',mapNote:'מפת ניווט סכמטית. ההדגשה מציינת אזור, ולא את גבולות השריר או את עומקו.',list:'שרירים באזור',results:'תוצאות חיפוש',empty:'לא נמצאו שרירים. נסו שם אחר או בחרו אזור.',return:'חזרה לרשימת השרירים',location:'מיקום',origin:'מוצא',insertion:'אחז',action:'פעולות עיקריות',joints:'מפרקים ותנועה',training:'הקשר לאימון',exercises:'תרגילים קשורים',primary:'שריר עיקרי',secondary:'שריר מסייע',stabilizer:'מייצב',noExercises:'טרם הוגדר קישור לתרגיל בספרייה.',source:'מקור מקצועי',missing:'פרטי מוצא ואחז לרשומה זו עדיין בהכנה. לא מוצג מידע שלא הושלם.',learnOnly:'מידע לימודי. בחירת אזור אינה אבחנה או שינוי בתוכנית האימון.',illustration:'המחשה של האזור',motion:'המחשות תנועה ושיקום',clear:'ניקוי החיפוש',spine:'למידה ושיקום עמוד השדרה',spineNote:'צווארי, חזי ומותני — מידע לימודי ותרגילים קיימים בספרייה. בחירת תרגיל לשיקום נעשית עם הצוות.',feedback:'דיווח על טעות, תקלה או הצעה',selection:'האזור שנבחר',count:'שרירים וקבוצות שרירים'},
 en:{title:'Body & muscle atlas',intro:'Choose a body region, search for a muscle and learn how it contributes to movement and training.',search:'Search muscles in Hebrew or English',region:'Body region',front:'Front view',back:'Back view',both:'Both sides',left:'Left',right:'Right',side:'Body side',zoom:'Zoom',reset:'Reset',map:'Two-dimensional navigation map',mapNote:'Schematic navigation map. Highlighting indicates a region, not a muscle’s boundaries or depth.',list:'Muscles in this region',results:'Search results',empty:'No muscles found. Try another name or choose a region.',return:'Back to muscle list',location:'Location',origin:'Origin',insertion:'Insertion',action:'Main actions',joints:'Joints & movement',training:'Training context',exercises:'Related exercises',primary:'Primary muscle',secondary:'Assisting muscle',stabilizer:'Stabilizer',noExercises:'No exercise link has been defined yet.',source:'Professional reference',missing:'Attachment details for this record are still being prepared. Incomplete facts are not displayed.',learnOnly:'Educational information. Selecting a region does not diagnose a condition or change your training plan.',illustration:'Region illustration',motion:'Movement & rehabilitation learning',clear:'Clear search',spine:'Spine learning & rehabilitation',spineNote:'Cervical, thoracic and lumbar regions — educational information and existing library exercises. Rehabilitation exercise selection belongs with your team.',feedback:'Report an error, problem or suggestion',selection:'Selected region',count:'muscles and muscle groups'},
} as const;

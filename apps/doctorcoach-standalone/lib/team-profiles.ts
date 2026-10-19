// Retained profile data; visibility does not remove clinical records or permissions.
export const teamProfiles=[
 {id:'tamir',visible:true,name:'ד״ר תמיר עילם',nameEn:'Dr. Tamir Eilam',title:'רפואה ותנועה',titleEn:'Medicine and movement',bio:'רופא ומאמן חדר כושר. התאמת פעילות גופנית סביב פציעות וחזרה הדרגתית לאימון.',bioEn:'Physician and fitness trainer. Individually adapted activity around injuries and a gradual return to training.',instagram:'dr.tamireilam'},
 {id:'nadav',visible:true,name:'נדב רון',nameEn:'Nadav Ron',title:'אימון וכוח',titleEn:'Training and strength',bio:'מאמן כושר מוסמך, מר ישראל בפיתוח גוף תחרותי לשנת 2024. בניית תוכניות אימון וליווי מתאמנים.',bioEn:'Certified fitness trainer and Mr. Israel bodybuilding 2024. Personal training plans and coaching.',instagram:'nadav.ron'},
 {id:'lior',visible:true,name:'ליאור זליקסון',nameEn:'Lior Zelikson',title:'תזונה קלינית וביצועים',titleEn:'Clinical nutrition and performance',bio:'דיאטן קליני. ליווי תזונתי אופציונלי, בהתאם לזמינות ולתיאום נפרד.',bioEn:'Clinical dietitian. Optional nutrition support, subject to availability and separate arrangements.',instagram:'liorzelikson'},
] as const;
export const visibleTeamProfiles=teamProfiles.filter(profile=>profile.visible);
export type PhotoMember='tamir'|'nadav'|'lior';
export const photoMembers=['tamir','nadav','lior'] as const;

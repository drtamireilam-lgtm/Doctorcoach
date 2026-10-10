import test from 'node:test';
import assert from 'node:assert/strict';
import {contentReviewReport} from '../lib/content-review-report.ts';
const item={mapping:{injury_id:'shoulder',name_he:'כתף',train_around_recommended:['a'],train_around_modify:[],rehab:['missing'],avoid_if_provocative:[]},details:[{sourceId:'a',exercise:{id:'resolved',name:'תרגיל',dose:'2 × 10',desc:'הוראות',cues:['שליטה'],easier:'קל',harder:'קשה'}}],contentHash:'new-hash',state:'changed',review:{contentHash:'old-hash',notes:'לשנות מינון',reviewerName:'רופא',updatedAt:'2026-10-10',version:2}};
test('report preserves stale review distinction, exact instructions and missing exercise gaps',()=>{
 const text=contentReviewReport([item]);
 for(const value of ['נדרשת בדיקה חוזרת','new-hash','old-hash','לשנות מינון','2 × 10','הוראות','שליטה','הקלה: קל','התקדמות: קשה','תרגיל חסר: missing','מזהה תרגיל: resolved'])assert.ok(text.includes(value),value);
 assert.ok(text.includes('אינו אישור רפואי'));
});
test('export respects supplied filtered rows and supports pending and empty lists',()=>{
 const text=contentReviewReport([{...item,state:'pending',review:null}]);
 assert.ok(text.includes('טרם נבדק'));assert.ok(!text.includes('old-hash'));assert.ok(!text.includes('לשנות מינון'));
 const empty=contentReviewReport([]);assert.ok(empty.includes('מיפויים בדוח: 0'));assert.ok(!empty.includes('כתף'));
});

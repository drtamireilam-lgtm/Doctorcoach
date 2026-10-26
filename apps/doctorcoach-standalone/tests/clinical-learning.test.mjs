import test from 'node:test';
import assert from 'node:assert/strict';
import * as routing from '../lib/learning-navigation.ts';

test('clinical deep links resolve their section while legacy guides and atlas links retain meaning',()=>{
 assert.equal(typeof routing.learningSection,'function');
 for(const [hash,section] of [['#learn','anatomy'],['#learn?region=shoulder&muscle=deltoid','anatomy'],['#learn?article=rpe','anatomy'],['#learn?section=physiology','physiology'],['#learn?article=atp','physiology'],['#learn?article=creatine','supplements'],['#learn?section=supplements&article=atp','physiology'],['#care?article=creatine','anatomy'],['#learn?section=evil&article=unknown','anatomy']])assert.equal(routing.learningSection(hash),section,hash);
 assert.equal(routing.learningTopic('#learn?article=atp'),'atp');
 assert.equal(routing.learningTopic('#learn?article=unknown'),null);
 assert.equal(routing.learningArticleHref('creatine'),'#learn?article=creatine');
});

test('every bilingual learning entry has complete review metadata and resolvable related content',async()=>{
 const {clinicalArticles}=await import('../lib/clinical-learning-content.ts');
 assert.equal(clinicalArticles.length,7);
 const ids=new Set(clinicalArticles.map(a=>a.id));
 assert.equal(ids.size,7);
 for(const article of clinicalArticles){
  assert.match(article.reviewedAt,/^2026-10-24$/);
  assert.ok(article.sources.length>0);
  for(const source of article.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.title.length>5);}
  for(const lang of ['he','en']){
   assert.ok(article[lang].title.length>1);
   for(const field of ['summary','practical','details'])assert.ok(article[lang][field]?.length>15,article.id+' '+lang+' '+field);
   if(article.section==='supplements')for(const field of ['benefit','evidence','risks','interactions','consult'])assert.ok(article[lang][field]?.length>20,article.id+' '+lang+' '+field);
  }
  for(const related of article.related)assert.ok(ids.has(related),article.id+' missing '+related);
 }
 for(const id of ['creatine','caffeine','protein']){
  const article=clinicalArticles.find(a=>a.id===id);
  assert.ok(article.related.some(id=>clinicalArticles.find(a=>a.id===id)?.section==='physiology'));
 }
});

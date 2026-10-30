import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const stretchCode=ts.transpileModule(fs.readFileSync(new URL('../lib/stretch-exercises.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {stretchTranslations}=await import('data:text/javascript;base64,'+Buffer.from(stretchCode).toString('base64'));
const authCode=ts.transpileModule(fs.readFileSync(new URL('../lib/auth-language.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const source=fs.readFileSync(new URL('../lib/localization.ts',import.meta.url),'utf8').replace("import {authHref} from './auth-language.ts';",authCode.replace(/export /g,'' )).replace("import hebrew from './locales/he.json';",`const hebrew=${fs.readFileSync(new URL('../lib/locales/he.json',import.meta.url),'utf8')};`).replace("import english from './locales/en.json';",`const english=${fs.readFileSync(new URL('../lib/locales/en.json',import.meta.url),'utf8')};`);
const code=ts.transpileModule(source.replace("import {stretchTranslations} from './stretch-exercises';",`const stretchTranslations=${JSON.stringify(stretchTranslations)};`),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {translateText,translateBookingHref}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('account return links translate in English and preserve Hebrew',()=>{
 for(const [he,en] of [['חזרה לבית','Back to Home'],['חזרה להגדרות','Back to settings']]){
  assert.equal(translateText(he,'en'),en);
  assert.equal(translateText(he,'he'),he);
 }
});
test('all catalog entries have English translations',()=>{
 const he=JSON.parse(fs.readFileSync(new URL('../lib/locales/he.json',import.meta.url))),en=JSON.parse(fs.readFileSync(new URL('../lib/locales/en.json',import.meta.url)));
 assert.equal(he.length,en.length);
 assert.ok(en.every(x=>typeof x==='string'&&x.trim()&&!/[\u0590-\u05ff]/u.test(x)));
 for(let i=0;i<he.length;i++) assert.equal(translateText(he[i],'en').trim(),en[i].trim());
});
test('Hebrew mode preserves strings and English mode preserves free text',()=>{
 assert.equal(translateText('הגדרות וחשבון','he'),'הגדרות וחשבון');
 assert.equal(translateText('היום כתבתי הערה פרטית ומיוחדת על המטופל','en'),'היום כתבתי הערה פרטית ומיוחדת על המטופל');
 assert.equal(translateText('₪500 / 60','en'),'₪500 / 60');
 assert.equal(translateText('DoctorCoach','en'),'DoctorCoach');
});
test('UI localization does not translate stored form values or handlers',()=>{
 const provider=fs.readFileSync(new URL('../components/language-provider.tsx',import.meta.url),'utf8');
 assert.ok(!provider.includes("['value'"));
 assert.ok(provider.includes("node.props['data-no-translate']"));
});

test('refactored trainee navigation and file labels translate completely',()=>{
 const pairs=[['הניווט שלך','Your navigation'],['חזרה לעוד','Back to More'],['טוענים את החשבון שלך…','Loading your account…'],['לא ניתן לטעון את החשבון כרגע.','Your account could not be loaded.'],['שיקום וכאב','Rehabilitation & pain'],['אימונים, ביצועים ומשקלים לאורך זמן','Workouts, performance and weights over time'],['תוכניות שיקום, כאב וטווחי תנועה','Rehabilitation plans, pain and range of motion'],['נתוני תזונה ומשקל גוף','Nutrition data and body weight']];
 for(const [he,en] of pairs)assert.equal(translateText(he,'en'),en);
});

test('updated onboarding and tour descriptions do not fall back to Hebrew in English',()=>{
 const welcome=JSON.parse(fs.readFileSync(new URL('../lib/prepared/welcome-cards.json',import.meta.url),'utf8'));
 for(const id of ['home','care','contact'])assert.ok(!/[\u0590-\u05ff]/u.test(translateText(welcome.find(c=>c.id===id).body_he,'en')),id);
});

 test('auth links preserve selected language and return section without changing other links',()=>{
 for(const language of ['en','he'])for(const path of ['/signin-with-chatgpt','/signout-with-chatgpt','/auth/signin','/auth/signout']){
  const result=new URL(translateBookingHref(path+'?return_to=%2F%23plan',language),'https://app.test');
  assert.equal(result.searchParams.get('lang'),language);
  assert.equal(result.searchParams.get('return_to'),'/?lang='+language+'#plan');
 }
 for(const href of ['https://evil.test/auth/signin','//evil.test/auth/signin','/#plan','/api/account'])assert.equal(translateBookingHref(href,'en'),href);
});
test('header appearance feedback translates every state and preserves Hebrew',()=>{
 for(const [he,en] of [
 ['שמירת העיצוב נכשלה. נסו שוב בהגדרות המראה.','Appearance could not be saved. Try again in appearance settings.'],
 ['העיצוב השתנה בחלון אחר. טענו אותו בהגדרות המראה.','Appearance changed in another window. Reload it in appearance settings.'],
 ['העיצוב נשמר בחשבון.','Appearance saved to your account.'],
 ['יש להתחבר לשמירת העיצוב.','Sign in to save your appearance.']
 ]){assert.equal(translateText(he,'en'),en);assert.equal(translateText(he,'he'),he);}
});

test('Localize renders localized auth hrefs while leaving form values intact',async()=>{
 const vm=await import('node:vm'),React=await import('react');
 const source=fs.readFileSync(new URL('../components/language-provider.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const language of ['en','he']){
  const exports={},require=name=>name==='react'?{...React,useContext:()=>({language})}:name==='react/jsx-runtime'?{jsx:React.createElement,jsxs:React.createElement}:name.includes('localization')?{translateText,translateBookingHref}:{};
  // JSX runtime expects a props object; render the real Localize traversal with React elements.
  const jsx=(type,props)=>React.createElement(type,props);
  vm.runInNewContext(code,{exports,require:name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:require(name)});
  const result=exports.Localize({children:React.createElement('a',{href:'/signin-with-chatgpt?return_to=%2F%23plan'},React.createElement('input',{value:'סקוואט'}))});
  const anchor=result.props.children;
  assert.equal(new URL(anchor.props.href,'https://app.test').searchParams.get('lang'),language);
  assert.equal(anchor.props.children.props.value,'סקוואט');
 }
});

test('progress screen headings and arrangement guidance translate without changing Hebrew',()=>{
 for(const [he,en] of [['ההתקדמות שלי','My progress'],['אפשר לסדר את כרטיסי ההתקדמות לפי מה שחשוב לכם.','Arrange progress cards by what matters to you.']]){
  assert.equal(translateText(he,'en'),en);assert.equal(translateText(he,'he'),he);
 }
});

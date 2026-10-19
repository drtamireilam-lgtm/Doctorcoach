import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as layout from '../lib/progress-layout.ts';
function fixture(request=async payload=>({...payload,version:1})){
 const states=[],exports={};let cursor=0,saves=0,latest=null,drop='body';
 const resource={data:{order:[...layout.progressCards],version:0},loading:false,error:'',reload(){},setData(value){this.data=value;}};
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){const i=cursor++;if(!(i in states))states[i]={current:initial};return states[i];},useEffect(){}},'react/jsx-runtime':jsx,'lucide-react':{},'../hooks/use-care':{useCareResource:()=>resource,careRequest:async(url,payload)=>{saves++;latest=payload;return request(payload);}},'./language-provider':{useLanguage:()=>({language:'he'})},'../lib/progress-layout':layout};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/progress-card-layout.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k],document:{elementFromPoint:()=>({closest:()=>({dataset:{progressCard:drop}})})}});
 function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
 const render=()=>{cursor=0;return exports.ProgressCardLayout({children:id=>jsx.jsx('div',{children:id})});};
 const find=predicate=>nodes(render()).find(predicate),click=text=>{const n=find(n=>n.type==='button'&&n.props.children===text);assert.ok(n,text);n.props.onClick();};
 return {find,click,render,resource,order:()=>nodes(render()).filter(n=>n.props?.['data-progress-card']).map(n=>n.props['data-progress-card']),get saves(){return saves;},get latest(){return latest;},setDrop:id=>{drop=id;}};
}
test('button alternative moves pain first and saves only after explicit confirmation',async()=>{
 const f=fixture();f.click('סידור הכרטיסים');
 for(let i=0;i<2;i++)f.find(n=>n.props?.['aria-label']==='הזזה למעלה: כאב ושיקום').props.onClick();
 assert.equal(f.order()[0],'recovery');assert.equal(f.saves,0);
 await f.find(n=>n.type==='button'&&n.props.children==='שמירת הסדר').props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.saves,1);assert.equal(f.latest.order[0],'recovery');assert.equal(f.latest.version,0);assert.ok(f.find(n=>n.props?.role==='status'&&n.props.children==='סדר הכרטיסים שלך נשמר.'));
});
test('touch/pointer cancellation restores the original order without saving',()=>{
 const f=fixture();f.click('סידור הכרטיסים');const handle=()=>f.find(n=>n.props?.['aria-label']==='גרירה לשינוי סדר: התמדה באימונים');
 handle().props.onPointerDown({pointerId:1,currentTarget:{closest:()=>({setPointerCapture(){}})}});
 f.render().props.onPointerMove({pointerId:1,clientX:10,clientY:100});assert.notEqual(f.order()[0],'consistency');
 f.render().props.onPointerCancel();assert.deepEqual(f.order(),[...layout.progressCards]);assert.equal(f.saves,0);
});
test('failed preference save retains the chosen order and does not claim success',async()=>{
 const f=fixture(async()=>{throw Error('offline');});f.click('סידור הכרטיסים');f.find(n=>n.props?.['aria-label']==='הזזה למעלה: כאב ושיקום').props.onClick();
 const chosen=f.order();await f.find(n=>n.type==='button'&&n.props.children==='שמירת הסדר').props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(f.order(),chosen);assert.ok(f.find(n=>n.props?.role==='alert'));assert.equal(f.resource.data.version,0);
});

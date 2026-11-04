import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const workflow=readFileSync(new URL('../../../.github/workflows/ci.yml',import.meta.url),'utf8');
function enabled(flag,github){
 const expression=workflow.match(new RegExp(`^      ${flag}: \\$\\{\\{ (.*) \\}\\}$`,'m'))?.[1];
 assert.ok(expression,`Missing ${flag} expression`);
 return vm.runInNewContext(expression,{github,startsWith:(value,prefix)=>(value??'').startsWith(prefix)});
}
for(const [event,github] of Object.entries({
 'premium push':{ref_name:'feature/doctorcoach-premium-ui-3',head_ref:'',base_ref:''},
 'premium pull request':{ref_name:'63/merge',head_ref:'feature/doctorcoach-premium-ui-3',base_ref:'codex/integration-59-60-61-20261029'},
 'integration target':{ref_name:'70/merge',head_ref:'fix/integration-regression',base_ref:'codex/integration-59-60-61-20261029'},
}))test(`${event} selects integration, cardio and anatomy browser checks`,()=>{
 for(const flag of ['LAB_AUDIT','CARDIO_CHECKS','ANATOMY_BROWSER_CHECKS'])assert.equal(enabled(flag,github),true,flag);
});
test('unrelated pull requests keep selective browser checks',()=>{
 const github={ref_name:'71/merge',head_ref:'docs/readme',base_ref:'main'};
 for(const flag of ['LAB_AUDIT','CARDIO_CHECKS','ANATOMY_BROWSER_CHECKS'])assert.equal(enabled(flag,github),false,flag);
});

function stepEnabled(name,github){
 const block=workflow.split(`      - name: ${name}\n`)[1];
 assert.ok(block,`Missing step ${name}`);
 const expression=block.match(/^        if: (.*)$/m)?.[1];
 assert.ok(expression,`Missing condition for ${name}`);
 return vm.runInNewContext(expression,{github,env:{LAB_AUDIT:String(enabled('LAB_AUDIT',github))},always:()=>true,startsWith:(value,prefix)=>(value??'').startsWith(prefix)});
}
for(const github of [
 {ref_name:'codex/integration-59-60-61-20261029',head_ref:'',base_ref:''},
 {ref_name:'70/merge',head_ref:'work/lab-acceptance-premium-ui-qa-20261104',base_ref:'codex/integration-59-60-61-20261029'},
])test(`integration ${github.head_ref?'PR':'push'} runs and retains full Premium visual coverage`,()=>{
 for(const name of ['Premium UI 3 local visual and interaction checks','Save Premium UI 3 screenshots','Premium Workout 4 bilingual dark and light workflows','Save Workout 4 evidence'])assert.equal(stepEnabled(name,github),true,name);
});

test('full visual suites run in a separate job so they do not consume standalone timeout',()=>{
 const visual=workflow.split('\n  premium-visual:\n')[1]?.split(/\n  [a-z][a-z-]*:\n/)[0];
 assert.ok(visual,'Full visual coverage needs its own bounded job');
 const standalone=workflow.split('\n  standalone:\n')[1];
 for(const name of ['Premium UI 3 local visual and interaction checks','Premium Workout 4 bilingual dark and light workflows']){
  assert.ok(visual.includes(`- name: ${name}`));
  assert.ok(!standalone.includes(`- name: ${name}`));
 }
 assert.ok(!visual.includes('needs:'),'Visual and runtime verification should run independently');
 const expression=visual.match(/^    if: \$\{\{ (.*) \}\}$/m)?.[1];
 assert.ok(expression,'Visual job needs an explicit event selector');
 for(const [github,expected] of [
  [{ref_name:'codex/integration-59-60-61-20261029',head_ref:'',base_ref:''},true],
  [{ref_name:'69/merge',head_ref:'work/lab-acceptance-premium-ui-qa-20261104',base_ref:'codex/integration-59-60-61-20261029'},true],
  [{ref_name:'65/merge',head_ref:'feature/premium-workout-4-20261030',base_ref:'main'},true],
  [{ref_name:'63/merge',head_ref:'feature/doctorcoach-premium-ui-3',base_ref:'main'},true],
  [{ref_name:'71/merge',head_ref:'docs/readme',base_ref:'main'},false],
 ])assert.equal(vm.runInNewContext(expression,{github,startsWith:(value,prefix)=>(value??'').startsWith(prefix)}),expected);
});

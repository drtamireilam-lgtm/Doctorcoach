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

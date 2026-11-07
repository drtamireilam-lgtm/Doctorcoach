import test from 'node:test';
import assert from 'node:assert/strict';
import {resetAppearance,colorsFor,themeTokens,contrast} from '../lib/advanced-theme.ts';
test('premium default uses the approved navy/cyan/gold and readable controls',()=>{
 const colors=colorsFor(resetAppearance),tokens=themeTokens(resetAppearance);
 assert.equal(colors.background,'#030b14');
 assert.equal(colors.accent,'#00e5f0');
 assert.equal(colors.button,'#f5b942');
 assert.ok(contrast(tokens['--dc-button-text'],colors.button)>=4.5);
});

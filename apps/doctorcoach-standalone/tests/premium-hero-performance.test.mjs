import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

test('the eager home hero stays within a 250 KiB mobile image budget',()=>{
 const component=readFileSync(new URL('../components/premium-home.tsx',import.meta.url),'utf8');
 const path=component.match(/src="(\/premium-ui-3\/[^\"]+)"/)?.[1];
 assert.ok(path,'Home hero asset must be explicit');
 assert.ok(statSync(new URL('../public'+path,import.meta.url)).size<=250*1024,'The above-the-fold hero must not force a multi-megabyte PNG download');
});

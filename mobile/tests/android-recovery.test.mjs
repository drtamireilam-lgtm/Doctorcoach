import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../android/app/src/main/java/com/doctorcoach/mobile/MainActivity.kt',import.meta.url),'utf8');
const reader=readFileSync(new URL('../android/app/src/main/java/com/doctorcoach/mobile/StepsReader.kt',import.meta.url),'utf8');
// Source contracts only: these do not compile or instrument the Android shell.
test('Android rationale actions open privacy policy on launch and new intent',()=>{
 assert.match(source,/androidx\.health\.ACTION_SHOW_PERMISSIONS_RATIONALE/);
 assert.match(source,/android\.intent\.action\.VIEW_PERMISSION_USAGE/);
 assert.match(source,/override fun onNewIntent/);
 assert.match(source,/\.appendPath\("privacy-policy"\)/);
 assert.match(source,/web\.loadUrl\(entryUrl\(intent\)\)/);
});
test('Android preserves provider install/update status and recovery link',()=>{
 assert.match(reader,/SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED/);
 assert.match(reader,/"provider-required"/);
 assert.match(source,/market:\/\/details\?id=com\.google\.android\.apps\.healthdata/);
 assert.match(source,/"provider-required"/);
});
test('dashboard persists failed reads and labels retained observations as old',()=>{
 const ui=readFileSync(new URL('../../apps/doctorcoach-standalone/components/activity-dashboard.tsx',import.meta.url),'utf8');
 assert.match(ui,/action:'read-status'/);
 assert.match(ui,/version:connected\.connection\.version/);
 assert.match(ui,/Install or update Health Connect/);
 assert.match(ui,/Previously synced totals/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('Android Health Connect 1.1.0 scaffold declares required SDK, AGP and AndroidX', () => {
 const app=readFileSync(new URL('../android/app/build.gradle.kts',import.meta.url),'utf8');
 const root=readFileSync(new URL('../android/build.gradle.kts',import.meta.url),'utf8');
 const properties=new URL('../android/gradle.properties',import.meta.url);
 assert.match(app,/connect-client:1\.1\.0/);
 assert.ok(Number(app.match(/compileSdk\s*=\s*(\d+)/)?.[1])>=36,'Health Connect 1.1.0 requires compileSdk >=36');
 const version=root.match(/com.android.application"\) version "(\d+)\.(\d+)\.(\d+)"/).slice(1).map(Number);
 assert.ok(version[0]>8 || version[0]===8&&(version[1]>9||version[1]===9&&version[2]>=1),'AGP >=8.9.1 required');
 assert.ok(existsSync(properties),'AndroidX property file required');
 assert.match(readFileSync(properties,'utf8'),/^android\.useAndroidX=true$/m);
});

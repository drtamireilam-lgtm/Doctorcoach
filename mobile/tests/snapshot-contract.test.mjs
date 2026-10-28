import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDays} from '../../apps/doctorcoach-standalone/lib/activity.ts';
const ios = readFileSync(new URL('../ios/DoctorCoach/StepsReader.swift', import.meta.url),'utf8');
const android = readFileSync(new URL('../android/app/src/main/java/com/doctorcoach/mobile/StepsReader.kt', import.meta.url),'utf8');
test('native serializers emit millisecond UTC and temporal coverage', () => {
 assert.match(ios, /formatter\.formatOptions = \[\.withInternetDateTime, \.withFractionalSeconds\]/);
 assert.match(ios, /"partial": end > now/);
 assert.match(android, /DateTimeFormatterBuilder\(\)\.appendInstant\(3\)/);
 assert.match(android, /"partial", end > now/);
 assert.match(android, /"startAt", timestamp\.format\(start\)/);
 assert.match(android, /"endAt", timestamp\.format\(end\)/);
 assert.match(android, /"observedAt", timestamp\.format\(now\)/);
});
for (const platform of ['healthkit','health_connect']) test(`${platform} historical/current/DST/null snapshots satisfy real backend parser`, () => {
 const method=platform==='healthkit'?'healthkit_cumulative':'health_connect_aggregate';
 const make=(date,startAt,endAt,observedAt,steps=null)=>({date,timezone:'America/New_York',startAt,endAt,observedAt,steps,partial:Date.parse(endAt)>Date.parse(observedAt),method,provenance:['platform-aggregate']});
 const historical=make('2026-03-08','2026-03-08T05:00:00.000Z','2026-03-09T04:00:00.000Z','2026-03-09T05:00:00.123Z');
 const current=make('2026-03-09','2026-03-09T04:00:00.000Z','2026-03-10T04:00:00.000Z','2026-03-09T05:00:00.123Z',0);
 const result=parseDays([historical,current],platform);
 assert.equal(result[0].partial,false); assert.equal(result[0].steps,null);
 assert.equal(result[1].partial,true); assert.equal(result[1].steps,0);
 assert.equal(Date.parse(result[0].endAt)-Date.parse(result[0].startAt),23*3600000);
 assert.throws(()=>parseDays([{...historical,partial:true}],platform));
 assert.throws(()=>parseDays([{...current,startAt:'2026-03-09T04:00:00Z'}],platform));
});

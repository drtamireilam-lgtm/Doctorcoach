import test from 'node:test';
import assert from 'node:assert/strict';
import {platform} from './platform-db.mjs';
import {palettes,isAppearance} from '../lib/appearance.ts';
import {appearanceStore} from '../lib/appearance-store.ts';
const luminance=hex=>{const rgb=hex.replace('#','').match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('all eighteen appearances meet normal-text contrast for buttons, accents and preview surfaces',()=>{
 assert.equal(palettes.length,9);
 for(const p of palettes){assert.ok(contrast('#ffffff',p.button)>=4.5,p.id+' button');for(const [accent,surface,canvas] of [[p.light,p.softLight,'#ffffff'],[p.dark,p.softDark,'#19191f']]){assert.ok(contrast(accent,surface)>=4.5,p.id+' accent/soft');assert.ok(contrast(accent,canvas)>=4.5,p.id+' accent/card');}}
});
test('appearance is persistent per owner with optimistic concurrency and validated values',async t=>{
 const f=platform(t),store=appearanceStore(f.db);
 assert.deepEqual(await store.get('a'),{appearance:null,version:0});
 for(const mode of ['light','dark'])for(const {id:palette} of palettes){const before=await store.get('a');await store.save('a',{appearance:{mode,palette},version:before.version,userId:'b'});assert.deepEqual((await store.get('a')).appearance,{mode,palette});}
 assert.equal((await store.get('b')).appearance,null);
 const before=await store.get('a');await assert.rejects(()=>store.save('a',{appearance:{mode:'light',palette:'blue'},version:0}),e=>e.status===409);
 for(const appearance of [{mode:'system',palette:'blue'},{mode:'light',palette:'__proto__'},{mode:'light',palette:'#123456'},null]){assert.equal(isAppearance(appearance),false);await assert.rejects(()=>store.save('a',{appearance,version:before.version}));}
 assert.deepEqual(await appearanceStore(f.db).get('a'),before);
});
test('account deletion barrier blocks preference insertion and update',async t=>{
 const f=platform(t),store=appearanceStore(f.db);await store.save('existing',{appearance:{mode:'dark',palette:'pink'},version:0});
 for(const id of ['new','existing'])f.sql.prepare("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES(?,?,'deleting','admin','2026-10-17')").run(id,'request-'+id);
 for(const [id,version] of [['new',0],['existing',1]])await assert.rejects(()=>store.save(id,{appearance:{mode:'light',palette:'green'},version}));
 assert.equal((await store.get('existing')).appearance.palette,'pink');
});

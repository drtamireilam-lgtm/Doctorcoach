import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {palettes} from '../lib/appearance.ts';
const surfaces=JSON.parse(readFileSync(new URL('../lib/appearance-surfaces.json',import.meta.url),'utf8'));
const luminance=h=>{const c=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const ratio=(a,b)=>{let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('all nine palettes have full backgrounds in both modes and readable token pairs',()=>{
 const css=readFileSync(new URL('../app/full-color-themes.css',import.meta.url),'utf8');
 const layout=readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
 assert.ok(layout.indexOf("import './full-color-themes.css'")>layout.indexOf("import './palettes.css'"),'full surfaces must override legacy accent-only palette rules');
 assert.match(css,/data-palette="yellow"\]\{--red:#664700/);
 assert.match(css,/data-palette="neutral"\]\{--red:#475569/);
 for(const p of palettes){assert.ok(surfaces[p.id]);for(const values of surfaces[p.id]){
  for(const bg of values.slice(0,3))for(const fg of [values[3],values[4],values[6]])assert.ok(ratio(bg,fg)>=4.5,`${p.id}: ${bg}/${fg} ${ratio(bg,fg)}`);
  for(const value of values)assert.ok(css.includes(value));
 }}
});
test('palette expansion preserves existing owner preferences, versions and deletion guards',()=>{
 const sql=new DatabaseSync(':memory:');try{
  const dir=new URL('../drizzle/',import.meta.url);
  for(const file of readdirSync(dir).filter(f=>/^\d+.*\.sql$/.test(f)&&parseInt(f,10)<50).sort())sql.exec(readFileSync(new URL(file,dir),'utf8'));
  const before={user_id:'old-owner',mode:'light',palette:'purple',version:7,updated_at:'2026-10-17'};
  sql.prepare('INSERT INTO appearance_preferences(user_id,mode,palette,version,updated_at) VALUES(?,?,?,?,?)').run(...Object.values(before));
  sql.exec('BEGIN');sql.exec(readFileSync(new URL('0050_full_color_palettes.sql',dir),'utf8'));sql.exec('COMMIT');
  assert.deepEqual({...sql.prepare('SELECT * FROM appearance_preferences WHERE user_id=?').get('old-owner')},before);
  for(const p of ['yellow','neutral'])sql.prepare("INSERT INTO appearance_preferences(user_id,mode,palette,updated_at) VALUES(?,'dark',?,'now')").run(p,p);
  assert.throws(()=>sql.prepare("INSERT INTO appearance_preferences(user_id,mode,palette,updated_at) VALUES('bad','dark','bogus','now')").run());
  assert.equal(sql.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND name LIKE 'deletion_guard_appearance_%'").get().n,2);
 }finally{sql.close();}
});

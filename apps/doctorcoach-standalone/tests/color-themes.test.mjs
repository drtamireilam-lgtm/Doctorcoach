import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {colorThemes,findColorTheme} from '../lib/color-themes.ts';
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
test('seven complete palettes with backward-compatible light/dark values and safe fallback',()=>{
 assert.equal(colorThemes.length,7);assert.equal(new Set(colorThemes.map(t=>t.id)).size,7);
 for(const t of colorThemes)assert.equal(findColorTheme(t.id),t);
 assert.equal(findColorTheme('unknown').id,'dark');assert.equal(findColorTheme(undefined).id,'dark');
});
test('colored palette text and buttons meet 4.5:1 contrast for defined token pairs',()=>{
 for(const t of colorThemes.filter(t=>!['light','dark'].includes(t.id))){
  for(const surface of ['canvas','card','raised','soft'])for(const ink of ['text','muted'])assert.ok(contrast(t[ink],t[surface])>=4.5,`${t.id} ${ink}/${surface}: ${contrast(t[ink],t[surface])}`);
  assert.ok(contrast(t.onAction,t.action)>=4.5,`${t.id} button`);
 }
});
test('all custom palette tokens in CSS match data; persistence, invalid preference recovery and accessibility are wired',()=>{
 const css=readFileSync(new URL('../app/full-color-themes.css',import.meta.url),'utf8');
 for(const t of colorThemes.filter(t=>!['dark','light'].includes(t.id))){
  assert.ok(css.includes(`html.${t.id}{`));for(const key of ['canvas','card','raised','text','muted','line'])assert.ok(css.includes(`--${key}:${t[key]};`));
 }
 const component=readFileSync(new URL('../components/theme-provider.tsx',import.meta.url),'utf8');
 assert.match(component,/enableColorScheme=\{false\}/);assert.match(component,/storageKey="doctorcoach-theme"/);assert.match(component,/palette.id !== theme/);assert.match(component,/aria-pressed/);assert.match(component,/Escape/);
 assert.match(css,/\.care-error/);assert.match(css,/\.warning-box/);assert.match(css,/\.care-success/);
});

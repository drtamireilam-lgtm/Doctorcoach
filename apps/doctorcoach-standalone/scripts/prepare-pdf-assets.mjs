import {cpSync,mkdirSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url),root=dirname(require.resolve('pdfjs-dist/package.json'));
const {version}=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const target=new URL(`../public/pdf-import-assets/${version}/`,import.meta.url);
mkdirSync(target,{recursive:true});
for(const folder of ['cmaps','standard_fonts'])cpSync(join(root,folder),new URL(folder,target),{recursive:true});

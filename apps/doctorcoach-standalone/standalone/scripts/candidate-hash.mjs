// Hash repository source only, excluding generated output and verification evidence.
import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const excluded = new Set(['node_modules', '.git', '.wrangler', '.next', 'dist', '.vite', '.vinext', '.sites-runtime', '.agents', '.codex', 'outputs', 'work', 'coverage', 'out']);
export async function candidateHash(root) {
  const entries = [];
  async function visit(dir, prefix = '') {
    for (const entry of await readdir(dir, {withFileTypes: true})) {
      const relative = prefix + entry.name;
      if (excluded.has(entry.name) || entry.name.startsWith('.env') || entry.name.startsWith('.dev.vars') || relative === 'public/pdf-import-assets' || relative === 'standalone/evidence.json' || entry.name === 'tsconfig.tsbuildinfo') continue;
      if (entry.isSymbolicLink()) throw new Error('Unexpected source symlink');
      if (entry.isDirectory()) await visit(path.join(dir, entry.name), relative + '/');
      else if (entry.isFile()) entries.push([relative, createHash('sha256').update(await readFile(path.join(dir, entry.name))).digest('hex')]);
    }
  }
  await visit(root);
  return createHash('sha256').update(JSON.stringify(entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))).digest('hex');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await candidateHash(process.argv[2] || process.cwd()));

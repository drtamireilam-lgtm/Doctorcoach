import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const buildDir = mkdtempSync(join(tmpdir(), 'doctorcoach-foundation-'));
try {
  // Use the supported compiler API rather than an unexported CLI subpath.
  // The separate build step performs full project type checking.
  for (const name of ['auth', 'backend', 'runtime-policy']) {
    const fileName = `src/platform/${name}.ts`;
    const compiled = ts.transpileModule(readFileSync(fileName, 'utf8'), {
      fileName,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    });
    writeFileSync(join(buildDir, `${name}.js`), compiled.outputText);
  }
  // node:test executes registered tests when this file runs directly as well.
  // Avoid isolation flags that differ between the Node 22 CI and Node 24 host.
  const tests = spawnSync(process.execPath, ['tests/foundation.test.cjs'], {
    stdio: 'inherit', env: { ...process.env, DOCTORCOACH_TEST_BUILD: buildDir },
  });
  if (tests.error) throw tests.error;
  process.exitCode = tests.status ?? 1;
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}

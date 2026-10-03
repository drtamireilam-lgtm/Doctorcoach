import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const buildDir = mkdtempSync(join(tmpdir(), 'doctorcoach-foundation-'));
try {
  const compile = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    'src/platform/backend.ts', 'src/platform/runtime-policy.ts',
    '--outDir', buildDir, '--target', 'ES2020', '--module', 'commonjs',
    '--strict', '--skipLibCheck', '--types', 'react'], { stdio: 'inherit' });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', '--test-isolation=none', 'tests/foundation.test.cjs'], {
      stdio: 'inherit', env: { ...process.env, DOCTORCOACH_TEST_BUILD: buildDir },
    });
    if (tests.error) throw tests.error;
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}

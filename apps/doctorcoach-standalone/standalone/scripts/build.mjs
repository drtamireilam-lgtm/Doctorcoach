// Standalone build only. Never invokes Sites authentication or publishes a Worker.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
process.chdir(root);
await import('../../scripts/prepare-pdf-assets.mjs');
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../../node_modules/vinext/dist/cli.js',import.meta.url)),'build'],{
 cwd:root,stdio:'inherit',timeout:180000,
 env:{...process.env,DC_BUILD_TARGET:'standalone',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'},
});
if(result.error){console.error('Standalone build failed or exceeded its time limit.');process.exitCode=1;}
else process.exitCode=result.status??1;

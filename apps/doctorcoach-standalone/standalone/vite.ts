import vinext from 'vinext';
export async function standaloneVite(){
 process.env.CLOUDFLARE_CF_FETCH_ENABLED??='false';process.env.WRANGLER_SEND_METRICS??='false';process.env.WRANGLER_WRITE_LOGS??='false';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {define:{'process.env.NEXT_PUBLIC_DC_ANATOMY_TARGET':JSON.stringify(process.env.DC_ISOLATED_STAGING_BUILD==='true'?'isolated-staging':'disabled')},plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false,configPath:process.env.DC_ISOLATED_STAGING_BUILD==='true'?'./standalone/wrangler.isolated-staging.json':'./standalone/wrangler.json'})]};
}

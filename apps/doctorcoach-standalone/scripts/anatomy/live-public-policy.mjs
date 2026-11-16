export const LAB_ORIGIN='https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev';
export function allowPublicRequest(input,method){
 try{const url=new URL(input);return ['GET','HEAD'].includes(method)&&url.origin===LAB_ORIGIN&&!url.username&&!url.password&&!/(?:^|\/)(?:auth|login|logout|signin|signout|callback)(?:\/|$)/i.test(url.pathname);}catch{return false;}
}

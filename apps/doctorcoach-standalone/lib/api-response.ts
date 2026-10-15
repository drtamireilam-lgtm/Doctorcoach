// Auth proxies may redirect an API fetch to an HTML sign-in page.
// Never treat that successful HTML response as an empty program or a saved action.
export function apiResponseFailure(response:Pick<Response,'ok'|'status'|'redirected'|'url'>,hasJson:boolean):{status:number;message:string}|null {
 if(response.status===401)return {status:401,message:'החיבור לחשבון פג. התחברו מחדש כדי להמשיך.'};
 if(!hasJson){
  let login=false;
  try{const url=new URL(response.url);login=response.redirected&&(url.hostname==='chatgpt.com'||/\/(signin-with-chatgpt|signout-with-chatgpt|callback|auth|login)(\/|$)/.test(url.pathname));}catch{}
  if(login)return {status:401,message:'החיבור לחשבון פג. התחברו מחדש כדי להמשיך.'};
  return {status:response.ok?502:response.status,message:'לא התקבלה תשובת נתונים מהשרת. טענו מחדש ונסו שוב.'};
 }
 return null;
}

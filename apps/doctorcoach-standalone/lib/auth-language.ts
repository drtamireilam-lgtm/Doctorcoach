// Only local application routes receive a language query. Keep route/search/hash intact.
export function returnWithLanguage(path:string,language:'he'|'en'):string {
 const url=new URL(path,'https://app.local');
 if(!path.startsWith('/')||url.origin!=='https://app.local')return '/?lang='+language;
 url.searchParams.set('lang',language);
 return url.pathname+url.search+url.hash;
}
export function authHref(href:string,language:'he'|'en'):string {
 if(!/^\/(?:sign(?:in|out)-with-chatgpt|auth\/sign(?:in|out))(?:[?#]|$)/.test(href))return href;
 const url=new URL(href,'https://app.local');
 url.searchParams.set('lang',language);
 url.searchParams.set('return_to',returnWithLanguage(url.searchParams.get('return_to')??'/',language));
 return url.pathname+url.search+url.hash;
}

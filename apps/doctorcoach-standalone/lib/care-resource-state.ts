export type CareResourceState<T>={url:string;data:T|null;error:string;status:number;loading:boolean};
export function emptyResource<T>(url:string):CareResourceState<T>{return {url,data:null,error:'',status:0,loading:true};}
// Never render a previous patient's response under a different request URL.
export function resourceForUrl<T>(state:CareResourceState<T>,url:string):CareResourceState<T>{return state.url===url?state:emptyResource<T>(url);}
export function failedResource<T>(state:CareResourceState<T>,url:string,error:string,status:number):CareResourceState<T>{
 const current=resourceForUrl(state,url);
 const request=new URL(url,'https://doctorcoach.invalid');
 const storyMode=request.searchParams.get('mode')??'public';
 const staleStory=status===409&&request.pathname==='/api/stories'&&['public','manage'].includes(storyMode);
 return {...current,data:[401,403,404].includes(status)||staleStory?null:current.data,error,status,loading:false};
}

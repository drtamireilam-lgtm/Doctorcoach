import {syntheticAuthProvider} from './synthetic-auth-provider.mjs';

// Service-binding-only fixture. No network fetch is implemented or forwarded.
const auth=syntheticAuthProvider(),events=new Map(),blocked=[];
let calendarFailure=false,creates=0;
export default {async fetch(req,env){
 const url=new URL(req.url);
 if(url.hostname==='pilot-fixture-control'){
  const {action,email,subject,value}=await req.json();
  if(action==='identity'){auth.identities.set(email,{subject});return Response.json({ok:true});}
  if(action==='code')return Response.json(auth.codeFor(email));
  if(action==='calendarFailure'){calendarFailure=value;return Response.json({ok:true});}
  if(action==='authFailure'){auth.outage=value;return Response.json({ok:true});}
  if(action==='state')return Response.json({creates,events:[...events],blocked});
  return Response.json({error:'Unknown fixture control'},{status:400});
 }
 if(url.origin==='https://auth.example.test')return auth.fetch(req);
 if(!['oauth2.googleapis.com','www.googleapis.com'].includes(url.hostname)){blocked.push(url.origin);return Response.json({error:'Blocked synthetic destination'},{status:403});}
 if(url.hostname==='oauth2.googleapis.com'){await req.text();return Response.json({access_token:'SYNTHETIC-GOOGLE',refresh_token:'SYNTHETIC-REFRESH',scope:env.SYNTHETIC_CALENDAR_SCOPE});}
 if(url.pathname.endsWith('/userinfo'))return Response.json({email:'owner@example.test',verified_email:true});
 if(calendarFailure){await req.text();return Response.json({error:'synthetic Calendar outage'},{status:503});}
 const id=url.pathname.split('/').at(-1);
 if(['POST','PUT'].includes(req.method)){const body=await req.json();if(req.method==='POST'){if(events.has(body.id))return Response.json({}, {status:409});creates++;}events.set(body.id,{...body,etag:'"synthetic"'});return Response.json({id:body.id});}
 if(req.method==='DELETE'){events.delete(id);return new Response(null,{status:204});}
 return events.has(id)?Response.json(events.get(id)):Response.json({}, {status:404});
}};

import {syntheticAuthProvider} from './synthetic-auth-provider.mjs';

// Service-bound fixture only: no network fetch, real identity or real Calendar.
const auth=syntheticAuthProvider({code:()=> '123456',firstExpiry:1});
const events=new Map(),blocked=[];let failure=false,creates=0;
export default {async fetch(req,env){
 const url=new URL(req.url);
 if(url.hostname==='runtime-fixture-control'){
  const {action,...body}=await req.json();
  if(action==='snapshot')return Response.json({auth:auth.snapshot(),events:[...events],blocked,failure,creates});
  if(action==='restore'){const state=body.state;auth.restore(state.auth);events.clear();for(const [id,event] of state.events)events.set(id,event);blocked.splice(0,blocked.length,...state.blocked);failure=state.failure;creates=state.creates;return Response.json({ok:true});}
  if(action==='identity')return Response.json({subject:auth.identities.get(body.email)?.subject??null});
  if(action==='calendarFailure'){failure=body.value;return Response.json({ok:true});}
  if(action==='state')return Response.json({creates,events:[...events],refreshCount:auth.refreshCount,blocked});
  return Response.json({error:'Unknown local fixture action'},{status:400});
 }
 if(url.origin==='https://auth.example.test')return auth.fetch(req);
 if(!['oauth2.googleapis.com','www.googleapis.com'].includes(url.hostname)){blocked.push(url.origin);return Response.json({error:'Blocked synthetic destination'},{status:403});}
 if(url.hostname==='oauth2.googleapis.com'){await req.text();return Response.json({access_token:'SYNTHETIC-GOOGLE-ACCESS',refresh_token:'SYNTHETIC-GOOGLE-REFRESH',scope:env.SYNTHETIC_CALENDAR_SCOPE});}
 if(url.pathname.endsWith('/userinfo'))return Response.json({email:'doctor@example.test',verified_email:true});
 if(failure){await req.text();return Response.json({error:'synthetic provider failure'},{status:503});}
 const id=url.pathname.split('/').at(-1);
 if(['POST','PUT'].includes(req.method)){
  const body=await req.json();if(req.method==='POST'){if(events.has(body.id))return Response.json({}, {status:409});creates++;}
  events.set(body.id,{...body,etag:'"synthetic"'});return Response.json({id:body.id});
 }
 if(req.method==='DELETE'){events.delete(id);return new Response(null,{status:204});}
 return events.has(id)?Response.json(events.get(id)):Response.json({}, {status:404});
}};

// Real React workspace + real SQLite-backed appointment store. Synthetic records only.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {platform,doctor,client} from '../tests/platform-db.mjs';
import {googleCalendarStore,CALENDAR_SCOPE} from '../lib/google-calendar.ts';
import {appointmentDate,israelAppointmentTime} from '../lib/appointments.ts';
const require=createRequire(import.meta.url),wr=require.resolve('wrangler/package.json'),{build}=createRequire(wr)('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=root+'/.sites-runtime/consultation-evidence';await mkdir(evidence,{recursive:true});
await build({entryPoints:[root+'/tests/fixtures/consultation-browser.tsx'],outfile:evidence+'/fixture.js',bundle:true,conditions:['style'],platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
let db,calendar,events,providerFail;const cleanups=[];
const calendarConfig={clientId:'synthetic',ownerEmail:doctor.email,adminEmails:doctor.email,encryptionKey:randomBytes(32).toString('base64url')};
async function google(url,init={}){if(url.endsWith('/token'))return Response.json({access_token:'synthetic',refresh_token:'synthetic',scope:CALENDAR_SCOPE});if(url.endsWith('/userinfo'))return Response.json({email:doctor.email,verified_email:true});if(providerFail)return Response.json({error:'SYNTHETIC FAILURE'},{status:503});const id=new URL(url).pathname.split('/').at(-1);if(init.method==='POST'||init.method==='PUT'){const body=JSON.parse(init.body);events.set(body.id,{...body,etag:'"synthetic"'});return Response.json({id:body.id});}if(init.method==='DELETE'){events.delete(id);return new Response(null,{status:204});}return events.has(id)?Response.json(events.get(id)):Response.json({}, {status:404});}

async function reset(){for(const close of cleanups.splice(0))close();db=platform({after:fn=>cleanups.push(fn)});events=new Map();providerFail=true;calendar=googleCalendarStore(db.db,calendarConfig,google);await calendar.credentials(doctor,'SYNTHETIC-SECRET',0);const begin=await calendar.begin(doctor);await calendar.finish(doctor,begin.state,begin.state,'synthetic');for(const [name,state] of [['Pending Synthetic','requested'],['Upcoming Synthetic','scheduled'],['Overdue Synthetic','scheduled'],['Absent Synthetic','scheduled'],['Completed Synthetic','completed'],['Cancelled Synthetic','cancelled'],['NoShow Synthetic','no_show']]){const a=await db.appointments.create(client,{id:randomUUID(),clientName:name,serviceId:'medical-video',expectedPrice:30000,preference:'Synthetic preference'});db.sql.prepare('UPDATE care_appointments SET state=?,starts_at=?,ends_at=? WHERE id=?').run(state,name.startsWith('Upcoming')?'2090-01-01T10:00:00Z':'2000-01-01T10:00:00Z',name.startsWith('Upcoming')?'2090-01-01T10:30:00Z':'2000-01-01T10:30:00Z',a.id);}}
await reset();
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');
 if(u.pathname==='/api/google-calendar'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({canConfigure:false}));}
 if(u.pathname==='/api/appointments'){
  res.setHeader('Content-Type','application/json');
  if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;const payload=JSON.parse(body);const a=payload.action==='retryCalendar'?await db.appointments.calendarTarget(doctor,payload.id,payload.version):await db.appointments.update(doctor,payload);const calendarSync=['schedule','cancel','retryCalendar'].includes(payload.action)?await calendar.sync(a.id,undefined,payload.action==='retryCalendar'):{status:'disabled'};return res.end(JSON.stringify({appointment:a,calendarSync}));}
  const appointments=await db.appointments.list(doctor,true,{view:u.searchParams.get('view')??undefined,query:u.searchParams.get('query')??undefined,status:u.searchParams.get('status')??undefined,dateFrom:u.searchParams.get('from')??undefined,dateTo:u.searchParams.get('to')??undefined});
  const statuses=await calendar.statuses(appointments.map(a=>a.id)),details=await calendar.details(appointments.map(a=>a.id));return res.end(JSON.stringify({appointments:appointments.map(a=>({...a,calendarStatus:statuses[a.id]??'none',calendarSync:details[a.id]})),canConfigureCalendar:false,canComplete:true,pendingCount:await db.appointments.pendingCount(doctor),nextOffset:null}));
 }
 if(u.pathname==='/fixture.js'||u.pathname==='/fixture.css'){res.setHeader('Content-Type',u.pathname.endsWith('.js')?'text/javascript':'text/css');return res.end(await readFile(evidence+u.pathname));}
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html lang="he" dir="rtl" class="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');
 }catch(error){res.statusCode=error.status??500;res.end(JSON.stringify({error:error.message}));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CONSULTATION_CHROMIUM_PATH});
try{for(const lang of ['he','en'])for(const width of [390,1440]){
 await reset();const page=await browser.newPage({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,timezoneId:width===390?'Asia/Jerusalem':'America/New_York'});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await page.goto(origin+'/?lang='+lang);
 const en=lang==='en';await page.getByRole('heading',{name:en?'Pending consultations (1)':'ממתינים לאישור (1)',exact:true}).waitFor();
 await page.getByRole('heading',{name:en?'Upcoming consultations (1)':'ייעוצים קרובים (1)',exact:true}).waitFor();
 await page.getByRole('heading',{name:en?'Action required (2)':'דורשים טיפול (2)',exact:true}).waitFor();
 assert.equal(await page.getByText('Completed Synthetic',{exact:true}).count(),0);
 const pending=page.locator('.appointment-card').filter({hasText:'Pending Synthetic'});
 await pending.getByRole('button',{name:en?'Schedule consultation':'תיאום מועד',exact:true}).click();
 await pending.locator('input[type="datetime-local"]').fill('2090-01-02T12:00');
 await pending.getByRole('button',{name:en?'Confirm and update time':'אישור ועדכון המועד',exact:true}).click();
 await page.getByRole('heading',{name:en?'Pending consultations (0)':'ממתינים לאישור (0)',exact:true}).waitFor();
 const approved=page.locator('.appointment-card').filter({hasText:'Pending Synthetic'});
 await approved.getByText(en?'The consultation was approved, but Google Calendar synchronization failed.':'הייעוץ אושר, אך הסנכרון ל-Google Calendar נכשל.',{exact:true}).waitFor();assert.equal(events.size,0);await page.screenshot({path:evidence+'/'+lang+'-'+width+'-calendar-failed.png',fullPage:true});providerFail=false;await approved.getByRole('button',{name:en?'Retry Calendar sync':'סנכרן שוב ליומן',exact:true}).click();await approved.getByText(en?'Synchronized':'סונכרן',{exact:false}).waitFor();assert.equal(events.size,1);const persisted=db.sql.prepare("SELECT event_id,last_synced_at FROM google_calendar_sync WHERE appointment_id=(SELECT id FROM care_appointments WHERE client_name='Pending Synthetic')").get();assert.ok(persisted.event_id);assert.ok(persisted.last_synced_at);providerFail=true;await approved.getByRole('button',{name:en?'Retry Calendar sync':'סנכרן שוב ליומן',exact:true}).click();await approved.getByText(en?'The consultation was approved, but Google Calendar synchronization failed.':'הייעוץ אושר, אך הסנכרון ל-Google Calendar נכשל.',{exact:true}).waitFor();providerFail=false;await approved.getByRole('button',{name:en?'Retry Calendar sync':'סנכרן שוב ליומן',exact:true}).click();await approved.getByText(en?'Synchronized':'סונכרן',{exact:false}).waitFor();assert.equal(events.size,1);await page.screenshot({path:evidence+'/'+lang+'-'+width+'-calendar-synced.png',fullPage:true});

 await approved.getByRole('button',{name:en?'Reschedule consultation':'שינוי מועד',exact:true}).click();
 await approved.locator('input[type="datetime-local"]').fill('2090-01-03T12:00');
 await approved.getByRole('button',{name:en?'Confirm and update time':'אישור ועדכון המועד',exact:true}).click();
 // A version refresh remounts the card. Wait for the persisted appointment time
 // before opening a dialog, otherwise the old card's dialog can disappear.
 await approved.locator('.appointment-time').filter({hasText:appointmentDate(israelAppointmentTime('2090-01-03T12:00'),lang)}).waitFor();
 assert.equal(events.size,1);await page.getByRole('heading',{name:en?'Pending consultations (0)':'ממתינים לאישור (0)',exact:true}).waitFor();
 await page.locator('.appointment-card').filter({hasText:'Pending Synthetic'}).getByRole('button',{name:en?'Cancel request / appointment':'ביטול הבקשה / המפגש',exact:true}).click();
 await page.getByRole('button',{name:en?'Confirm cancellation':'אישור ביטול',exact:true}).click();
 await page.getByRole('heading',{name:en?'Upcoming consultations (1)':'ייעוצים קרובים (1)',exact:true}).waitFor();

 await page.getByRole('button',{name:en?'Consultation history':'היסטוריית ייעוצים',exact:true}).click();
 const search=page.getByLabel(en?'Search by patient name':'חיפוש לפי שם מטופל',{exact:true});await search.fill('Completed');await page.getByText(/Completed Synthetic ·/).waitFor();assert.equal(await page.getByText(/Cancelled Synthetic ·/).count(),0);
 await search.fill('');await page.getByText(/Cancelled Synthetic ·/).waitFor();await page.getByText(/NoShow Synthetic ·/).waitFor();
 await page.getByLabel(en?'Consultation status':'סטטוס הייעוץ',{exact:true}).click();await page.getByRole('option',{name:en?'Cancelled':'בוטל',exact:true}).click();await page.getByText(/Cancelled Synthetic ·/).waitFor();assert.equal(await page.getByText(/Completed Synthetic ·/).count(),0);
 await page.screenshot({path:evidence+'/'+lang+'-'+width+'-history.png',fullPage:true});
 await page.getByRole('button',{name:en?'Active consultations':'ייעוצים פעילים',exact:true}).click();
 await page.locator('.appointment-card').filter({hasText:'Overdue Synthetic'}).getByRole('button',{name:en?'Mark appointment completed':'סימון המפגש כהסתיים',exact:true}).click();
 await page.locator('.appointment-card').filter({hasText:'Absent Synthetic'}).getByRole('button',{name:en?'Mark as no-show':'סימון אי הגעה',exact:true}).click();
 await page.getByRole('heading',{name:en?'Action required (0)':'דורשים טיפול (0)',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:en?'Action required (0)':'דורשים טיפול (0)',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:evidence+'/'+lang+'-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);await page.close();console.log('PASS '+lang+' '+width+': approval failure, retry, verified Google receipt, single-event reschedule, cancellation, history, search, status, completion, no-show, reload, no overflow');
 }}finally{await browser.close();server.close();for(const close of cleanups)close();}

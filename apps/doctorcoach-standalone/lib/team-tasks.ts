export const taskChannels={medical:'משימה רפואית',training:'משימת אימון',nutrition:'משימת תזונה',scheduling:'משימת תיאום'};
export type TaskChannel=keyof typeof taskChannels;
export const taskStates={open:'פתוח',in_progress:'בטיפול',completed:'הושלם'};
export type TaskState=keyof typeof taskStates;
export type TeamTask={id:string;clientId:string;clientName:string;channel:TaskChannel;title:string;details:string;assigneeEmail:string;assigneeName:string;dueDay:string|null;state:TaskState;version:number;createdAt:string;updatedAt:string;canEdit:boolean;canUpdateState:boolean};
export type TaskOption={clientId:string;clientName:string;channel:TaskChannel;assignees:{email:string;name:string}[]};
export type TaskEvent={id:string;actorEmail:string;action:string;snapshot:{title:string;details:string;assigneeEmail:string;dueDay:string|null;state:TaskState};createdAt:string};
export type TeamTasksOverview={tasks:TeamTask[];options:TaskOption[];limited:boolean;selfEmail:string;today:string};
export function israelTaskDay(at=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
export function validTaskDay(day:unknown){if(day==null||day==='')return null;if(typeof day!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(day)||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)throw new Error('בחרו תאריך חזרה תקין.');return day;}
export function taskOverdue(t:Pick<TeamTask,'state'|'dueDay'>,today=israelTaskDay()){return t.state!=='completed'&&!!t.dueDay&&t.dueDay<today;}

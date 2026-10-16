import {TrainingError,isRecord} from './training.ts';
export const progressCards=['consistency','performance','recovery','body','timeline'] as const;
export type ProgressCard=typeof progressCards[number];
export function parseProgressOrder(value:unknown):ProgressCard[]{
 if(!Array.isArray(value)||value.length!==progressCards.length||new Set(value).size!==progressCards.length||!value.every(id=>progressCards.includes(id as ProgressCard)))throw new TrainingError('סדר הכרטיסים אינו תקין.');
 return [...value] as ProgressCard[];
}
export function moveProgressCard(order:ProgressCard[],id:ProgressCard,target:ProgressCard){
 const from=order.indexOf(id),to=order.indexOf(target);if(from<0||to<0||from===to)return order;
 const next=[...order];next.splice(from,1);next.splice(to,0,id);return next;
}
export type ProgressLayout={order:ProgressCard[];version:number};
export function progressLayoutStore(db:D1Database){return {
 async get(userId:string):Promise<ProgressLayout>{const row=await db.prepare('SELECT order_json,version FROM progress_layouts WHERE user_id=?').bind(userId).first<{order_json:string;version:number}>();return {order:row?parseProgressOrder(JSON.parse(row.order_json)):[...progressCards],version:row?.version??0};},
 async save(userId:string,payload:unknown):Promise<ProgressLayout>{
  if(!isRecord(payload)||!Number.isInteger(payload.version)||Number(payload.version)<0||Number(payload.version)>1000000)throw new TrainingError('גרסת ההעדפה אינה תקינה.');
  const order=parseProgressOrder(payload.order),at=new Date().toISOString();
  const row=payload.version===0?await db.prepare('INSERT INTO progress_layouts(user_id,order_json,updated_at) VALUES(?,?,?) ON CONFLICT DO NOTHING RETURNING user_id').bind(userId,JSON.stringify(order),at).first():await db.prepare('UPDATE progress_layouts SET order_json=?,version=version+1,updated_at=? WHERE user_id=? AND version=? RETURNING user_id').bind(JSON.stringify(order),at,userId,payload.version).first();
  if(!row)throw new TrainingError('סדר הכרטיסים השתנה בחלון אחר. טענו את הסדר השמור לפני ניסיון נוסף.',409);
  return this.get(userId);
 }
};}

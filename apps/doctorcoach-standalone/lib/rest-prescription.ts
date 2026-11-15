export function parseRestSeconds(raw:string):number|null{
 const text=raw.trim().toLowerCase();if(!text)return null;
 const clock=/^(\d+):([0-5]\d)$/.exec(text),quantity=/^(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|שניות|שנייה|min|mins|minutes?|דקות|דקה)?$/.exec(text);
 const value=clock?Number(clock[1])*60+Number(clock[2]):quantity?Number(quantity[1])*(/^(min|דק)/.test(quantity[2]??'')?60:1):NaN;
 if(!Number.isInteger(value)||value<0||value>1800)throw new Error('Rest: enter 0–1800 seconds, explicit minutes, or mm:ss. / מנוחה: יש להזין שניות, דקות מפורשות או דקות:שניות.');return value;
}

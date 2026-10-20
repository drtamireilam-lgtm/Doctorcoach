export const channels={medical:'רפואה · תמיר',training:'אימון · נדב',nutrition:'תזונה · ליאור',scheduling:'תיאום · שירה'};
export type Channel=keyof typeof channels;
export type Message={id:string;clientId:string;channel:Channel;authorId:string;authorName:string;authorRole:string;content:string;createdAt:string};
export type Thread={clientId:string;name:string;channel:Channel;unread:number;latestAt:string|null;available:boolean};

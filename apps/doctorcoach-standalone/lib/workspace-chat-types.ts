export type WorkspaceMessage={id:string;sequence:number;authorName:string;authorRole:'coach'|'trainee';content:string;createdAt:string;mine:boolean};
export type WorkspaceConversation={messages:WorkspaceMessage[];unread:number;canSend:boolean;hasOlder:boolean;oldestSequence:number|null};

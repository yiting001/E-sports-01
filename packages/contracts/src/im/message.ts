/** 消息内容类型，支持文字/图片/视频，system 为成员变更等系统提示 */
export enum MessageType {
  Text = "text",
  Image = "image",
  Video = "video",
  System = "system",
}

/**
 * 会话类型：私聊 / 群聊 / 客服。
 * 三者复用同一消息与成员模型，仅在语义与状态机上区分。
 */
export enum ConversationType {
  Private = "private",
  Group = "group",
  Service = "service",
}

/** 系统消息的发送者标识，前端据此渲染为居中灰色提示 */
export const SYSTEM_SENDER_ID = "system";

/** 引用回复的原消息快照（发送时冻结，避免读侧逐条联查） */
export interface MessageReplyPreview {
  /** 被引用消息 id */
  id: string;
  /** 被引用消息发送者 id */
  senderId: string;
  /** 被引用消息发送者用户名 */
  senderName: string;
  /** 被引用消息类型 */
  type: MessageType;
  /** 被引用消息内容（文本截断后的摘要或媒体 URL） */
  content: string;
}

/** 客户端发送消息的载荷 */
export interface SendMessagePayload {
  conversationId: string;
  type: MessageType;
  /** 文本内容或媒体资源 URL */
  content: string;
  /** 被 @ 的用户 id 列表（仅会话成员有效） */
  mentions?: string[];
  /** 引用回复的原消息 id（需属于同一会话） */
  replyToId?: string;
}

/** 客户端确认已展示到的最后一条消息，服务端据此单调推进已读位点。 */
export interface MarkReadPayload {
  conversationId: string;
  messageId: string;
}

/** 服务端广播的消息体 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  /** 被 @ 的用户 id 列表，无则为 null */
  mentions: string[] | null;
  /** 引用回复的原消息快照，无则为 null */
  replyTo: MessageReplyPreview | null;
  createdAt: number;
}

/** 聊天记录搜索查询参数（REST GET /im/messages/search，日期为 YYYY-MM-DD 闭区间） */
export interface SearchMessagesQuery {
  conversationId: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

/** WebSocket 事件名常量，前后端共享避免硬编码字符串 */
export const IM_EVENTS = {
  join: "im:join",
  /** 客户端携带最后可见消息游标，服务端据此单调推进成员已读位点 */
  markRead: "im:mark-read",
  send: "im:send",
  receive: "im:receive",
  /** 服务端仅向相关用户个人房间发送，提示重新获取未读汇总 */
  unreadChanged: "im:unread:changed",
  error: "im:error",
  joined: "im:joined",
  /** 服务端推送：某会话需在客户端列表中新增/更新（如被拉入群、被分配客服） */
  conversation: "im:conversation",
  /** 仅观察客服队列变化，不声明当前连接可参与自动分配 */
  observeService: "im:service:observe",
  /** 客服工作台订阅队列并声明当前连接可参与自动分配 */
  watchService: "im:service:watch",
  /** 服务端推送：有新访客进入客服队列（仅发往坐席） */
  serviceQueued: "im:service:queued",
} as const;

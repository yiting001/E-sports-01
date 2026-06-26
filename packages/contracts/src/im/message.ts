/** 消息内容类型，支持文字/图片/视频，system 为成员变更等系统提示 */
export enum MessageType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
  System = 'system',
}

/**
 * 会话类型：私聊 / 群聊 / 客服。
 * 三者复用同一消息与成员模型，仅在语义与状态机上区分。
 */
export enum ConversationType {
  Private = 'private',
  Group = 'group',
  Service = 'service',
}

/** 系统消息的发送者标识，前端据此渲染为居中灰色提示 */
export const SYSTEM_SENDER_ID = 'system';

/** 客户端发送消息的载荷 */
export interface SendMessagePayload {
  conversationId: string;
  type: MessageType;
  /** 文本内容或媒体资源 URL */
  content: string;
}

/** 服务端广播的消息体 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  createdAt: number;
}

/** WebSocket 事件名常量，前后端共享避免硬编码字符串 */
export const IM_EVENTS = {
  join: 'im:join',
  send: 'im:send',
  receive: 'im:receive',
  error: 'im:error',
  joined: 'im:joined',
  /** 服务端推送：某会话需在客户端列表中新增/更新（如被拉入群、被分配客服） */
  conversation: 'im:conversation',
  /** 坐席订阅客服队列推送 */
  watchService: 'im:service:watch',
  /** 服务端推送：有新访客进入客服队列（仅发往坐席） */
  serviceQueued: 'im:service:queued',
} as const;

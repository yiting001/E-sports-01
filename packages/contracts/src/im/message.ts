/** 消息内容类型，基础设施期支持文字/图片/视频 */
export enum MessageType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
}

/**
 * 会话类型。
 * 当前期只实现基础收发与持久化，
 * group / service 为后续群聊、客服功能预留的扩展点。
 */
export enum ConversationType {
  Private = 'private',
  Group = 'group',
  Service = 'service',
}

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
  send: 'im:send',
  receive: 'im:receive',
  error: 'im:error',
  joined: 'im:joined',
} as const;

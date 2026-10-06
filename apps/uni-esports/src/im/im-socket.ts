import type {
  ChatMessage,
  ConversationView,
  MarkReadPayload,
  SendMessagePayload,
} from '@app/contracts';
import { IM_EVENTS } from '@app/contracts';
import { io, type Socket } from 'socket.io-client';
import { ENV } from '@/config/env';
import { tokenStorage } from '@/api/token-storage';

const MARK_READ_ACK_TIMEOUT_MS = 5000;

/**
 * 小程序端 IM 客户端封装（联系客服/订单群）。
 * 与 apps/client 的 use-im-socket 同构：复用访问令牌握手鉴权，连接 /im 命名空间，
 * 暴露进房/发送与消息订阅；WebSocket 由 wechat-socket 垫片提供。
 */
export function createImSocket() {
  let socket: Socket | null = null;

  function connect(): Socket {
    socket = io(`${ENV.wsBaseUrl}/im`, {
      transports: ['websocket'],
      auth: { token: tokenStorage.getAccess() },
    });
    return socket;
  }

  /** 进入会话房间并拉取历史消息（通过 ack 回调返回） */
  function join(conversationId: string): Promise<ChatMessage[]> {
    return new Promise((resolve) => {
      socket?.emit(IM_EVENTS.join, conversationId, (history: ChatMessage[]) => {
        resolve(history ?? []);
      });
    });
  }

  function send(payload: SendMessagePayload): void {
    socket?.emit(IM_EVENTS.send, payload);
  }

  /** 页面展示到某条消息后推进服务端已读位点，返回服务端确认结果 */
  function markRead(
    conversationId: string,
    messageId: string,
  ): Promise<boolean> {
    const activeSocket = socket;
    if (!activeSocket) {
      return Promise.resolve(false);
    }
    const payload: MarkReadPayload = { conversationId, messageId };
    return new Promise((resolve) => {
      activeSocket
        .timeout(MARK_READ_ACK_TIMEOUT_MS)
        .emit(IM_EVENTS.markRead, payload, (error: Error | null, marked: boolean) => {
          resolve(!error && marked === true);
        });
    });
  }

  function onReceive(handler: (message: ChatMessage) => void): void {
    socket?.on(IM_EVENTS.receive, handler);
  }

  /** 个人房间会话更新用于实时同步会话标题等服务端权威视图 */
  function onConversation(handler: (conversation: ConversationView) => void): void {
    socket?.on(IM_EVENTS.conversation, handler);
  }

  function onError(handler: (error: { message: string }) => void): void {
    socket?.on(IM_EVENTS.error, handler);
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
  }

  return { connect, join, send, markRead, onReceive, onConversation, onError, disconnect };
}

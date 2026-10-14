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

/**
 * IM 客户端（socket.io · /im 命名空间），客服会话与订单群聊共用。
 * 与 apps/client 的 use-im-socket、apps/uni-esports 的 im-socket 同构：
 * 用访问令牌握手鉴权，暴露进房（join 的 ack 直接返回历史消息）、发送、已读推进与订阅。
 *
 * 事件契约（见 packages/contracts 的 IM_EVENTS 与服务端 im.gateway）：
 * - 上行：im:join / im:send / im:mark-read
 * - 下行：im:receive（会话消息）/ im:joined / im:unread:changed（仅刷新信号）/ im:conversation / im:error
 */

const MARK_READ_ACK_TIMEOUT_MS = 5000;
/** 进房历史回执超时：连接未建立或服务端异常时避免页面卡在加载中 */
const JOIN_ACK_TIMEOUT_MS = 8000;

export function createImSocket() {
  let socket: Socket | null = null;

  function connect(): Socket {
    socket = io(`${ENV.wsBaseUrl}/im`, {
      transports: ['websocket'],
      auth: { token: tokenStorage.getAccess() },
    });
    return socket;
  }

  /** 进入会话房间并等待历史消息（服务端在 join 的 ack 里回传最近消息；超时按空历史处理） */
  function join(conversationId: string): Promise<ChatMessage[]> {
    return new Promise((resolve) => {
      const activeSocket = socket;
      if (!activeSocket) {
        resolve([]);
        return;
      }
      const timer = setTimeout(() => resolve([]), JOIN_ACK_TIMEOUT_MS);
      activeSocket.emit(IM_EVENTS.join, conversationId, (history: ChatMessage[]) => {
        clearTimeout(timer);
        resolve(history ?? []);
      });
    });
  }

  function send(payload: SendMessagePayload): void {
    socket?.emit(IM_EVENTS.send, payload);
  }

  /** 页面展示到某条消息后推进服务端已读位点，返回服务端确认结果 */
  function markRead(conversationId: string, messageId: string): Promise<boolean> {
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

  function onConnected(handler: () => void): void {
    socket?.on('connect', handler);
  }

  function onDisconnected(handler: () => void): void {
    socket?.on('disconnect', handler);
  }

  function onReceive(handler: (message: ChatMessage) => void): void {
    socket?.on(IM_EVENTS.receive, handler);
  }

  /** 会话视图变更（被拉群/客服接入/标题同步），以服务端视图为准 */
  function onConversation(handler: (conversation: ConversationView) => void): void {
    socket?.on(IM_EVENTS.conversation, handler);
  }

  /** 未读变化信号（无正文）：客户端据此重拉会话列表 */
  function onUnreadChanged(handler: () => void): void {
    socket?.on(IM_EVENTS.unreadChanged, handler);
  }

  function onError(handler: (error: { message: string }) => void): void {
    socket?.on(IM_EVENTS.error, handler);
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
  }

  return {
    connect,
    join,
    send,
    markRead,
    onConnected,
    onDisconnected,
    onReceive,
    onConversation,
    onUnreadChanged,
    onError,
    disconnect,
  };
}

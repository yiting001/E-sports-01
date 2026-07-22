import { IM_EVENTS } from '@app/contracts';
import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from '@/api/token-storage';
import { ENV } from '@/config/env';

export interface PresenceSocketHandlers {
  onConversationChanged?: () => void;
  onUnreadChanged?: () => void;
}

/**
 * 登录用户的全局在线连接。服务端以鉴权后的 /im 连接维护打手在线快照；
 * 同一连接订阅个人房间的会话/未读变化信号，但不订阅聊天房间或消息正文。
 */
export function createPresenceSocket(handlers: PresenceSocketHandlers = {}) {
  let socket: Socket | null = null;

  function connect(): void {
    const token = tokenStorage.getAccess();
    if (!token) {
      disconnect();
      return;
    }
    if (socket?.connected) {
      return;
    }
    socket?.disconnect();
    const nextSocket = io(`${ENV.wsBaseUrl}/im`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (done) => done({ token: tokenStorage.getAccess() ?? '' }),
    });
    if (handlers.onUnreadChanged) {
      nextSocket.on(IM_EVENTS.unreadChanged, handlers.onUnreadChanged);
    }
    if (handlers.onConversationChanged) {
      nextSocket.on(IM_EVENTS.conversation, handlers.onConversationChanged);
    }
    socket = nextSocket;
    socket.connect();
  }

  function reconnect(): void {
    disconnect();
    connect();
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
  }

  const stopTokenWatch = tokenStorage.onChange(() => {
    if (tokenStorage.getAccess()) {
      reconnect();
    } else {
      disconnect();
    }
  });

  function dispose(): void {
    stopTokenWatch();
    disconnect();
  }

  return { connect, disconnect, dispose };
}

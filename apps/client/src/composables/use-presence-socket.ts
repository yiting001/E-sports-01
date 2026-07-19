import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from '@/api/token-storage';
import { ENV } from '@/config/env';

/**
 * 登录用户的全局在线连接。服务端以鉴权后的 /im 连接维护打手在线快照；
 * 本客户端不订阅聊天房间，也不在前端自行推断其他用户状态。
 */
export function createPresenceSocket() {
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
    socket = io(`${ENV.wsBaseUrl}/im`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (done) => done({ token: tokenStorage.getAccess() ?? '' }),
    });
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

import type { ChatMessage, SendMessagePayload } from '@app/contracts';
import { IM_EVENTS } from '@app/contracts';
import { io, type Socket } from 'socket.io-client';
import { ENV } from '@/config/env';
import { tokenStorage } from '@/api/token-storage';

/**
 * IM 客户端封装。
 * 复用 RBAC 访问令牌完成握手鉴权，连接 /im 命名空间；
 * 仅暴露 join/send/onReceive/onError/disconnect，隔离 socket.io 细节。
 */
export function createImSocket() {
  let socket: Socket | null = null;

  function connect(): Socket {
    socket = io(`${ENV.wsBaseUrl}/im`, {
      transports: ['websocket'],
      auth: { token: tokenStorage.getAccess() ?? '' },
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

  function onReceive(handler: (message: ChatMessage) => void): void {
    socket?.on(IM_EVENTS.receive, handler);
  }

  function onError(handler: (error: { message: string }) => void): void {
    socket?.on(IM_EVENTS.error, handler);
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
  }

  return { connect, join, send, onReceive, onError, disconnect };
}

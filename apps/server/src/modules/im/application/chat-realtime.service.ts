import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * 实时通道服务。
 * 持有 Socket.IO Server 引用，集中房间命名与广播逻辑；
 * 用例层通过它推送事件，从而与网关解耦（避免网关 ↔ 用例循环依赖）。
 * 同时维护坐席在线状态，供客服自动分配与队列推送使用。
 */
@Injectable()
export class ChatRealtimeService {
  private static readonly AGENTS_ROOM = 'service:agents';

  private server: Server | null = null;
  /** socketId → 坐席 userId，用于断线时反查清理 */
  private readonly agentSockets = new Map<string, string>();

  /** 网关初始化后注入 Server 引用 */
  bind(server: Server): void {
    this.server = server;
  }

  conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  userRoom(userId: string): string {
    return `user:${userId}`;
  }

  /** 向会话房间内所有成员广播 */
  emitToConversation(conversationId: string, event: string, payload: unknown): void {
    this.server?.to(this.conversationRoom(conversationId)).emit(event, payload);
  }

  /** 向某用户的所有在线连接推送（不要求其已在会话房间内） */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(this.userRoom(userId)).emit(event, payload);
  }

  /** 向所有订阅了客服队列的坐席推送 */
  emitToAgents(event: string, payload: unknown): void {
    this.server?.to(ChatRealtimeService.AGENTS_ROOM).emit(event, payload);
  }

  agentsRoom(): string {
    return ChatRealtimeService.AGENTS_ROOM;
  }

  registerAgent(socketId: string, userId: string): void {
    this.agentSockets.set(socketId, userId);
  }

  unregisterAgent(socketId: string): void {
    this.agentSockets.delete(socketId);
  }

  /** 当前在线坐席的去重 userId 列表，供自动分配挑选 */
  onlineAgents(): string[] {
    return [...new Set(this.agentSockets.values())];
  }
}

import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

interface OnlineAgentIdentity {
  userId: string;
  tenantId: string | null;
  isSuper: boolean;
}

/**
 * 实时通道服务。
 * 持有 Socket.IO Server 引用，集中房间命名与广播逻辑；
 * 用例层通过它推送事件，从而与网关解耦（避免网关 ↔ 用例循环依赖）。
 * 同时维护坐席在线状态，供客服自动分配与队列推送使用。
 */
@Injectable()
export class ChatRealtimeService {
  private static readonly TENANT_AGENTS_ROOM_PREFIX = 'service:agents:tenant:';
  private static readonly SUPER_AGENTS_ROOM = 'service:agents:super';

  private server: Server | null = null;
  /** socketId → 坐席身份，用于租户内自动分配与断线清理 */
  private readonly agentSockets = new Map<string, OnlineAgentIdentity>();

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

  /** 向当前租户坐席及具备跨租户可见性的超管推送客服队列事件 */
  emitToAgents(tenantId: string, event: string, payload: unknown): void {
    this.server
      ?.to([
        this.tenantAgentsRoom(tenantId),
        ChatRealtimeService.SUPER_AGENTS_ROOM,
      ])
      .emit(event, payload);
  }

  /** 普通坐席进入所属租户房间；超管进入只读跨租户观察房间 */
  agentsRoom(tenantId: string | null, isSuper: boolean): string | null {
    if (isSuper) {
      return ChatRealtimeService.SUPER_AGENTS_ROOM;
    }
    return tenantId ? this.tenantAgentsRoom(tenantId) : null;
  }

  registerAgent(
    socketId: string,
    userId: string,
    tenantId: string | null,
    isSuper: boolean,
  ): void {
    if (!isSuper && !tenantId) {
      return;
    }
    this.agentSockets.set(socketId, { userId, tenantId, isSuper });
  }

  unregisterAgent(socketId: string): void {
    this.agentSockets.delete(socketId);
  }

  /** 当前租户普通在线坐席的去重 userId 列表，供自动分配挑选 */
  onlineAgents(tenantId: string): string[] {
    const userIds = [...this.agentSockets.values()]
      .filter(
        (identity) =>
          !identity.isSuper && identity.tenantId === tenantId,
      )
      .map((identity) => identity.userId);
    return [...new Set(userIds)];
  }

  private tenantAgentsRoom(tenantId: string): string {
    return ChatRealtimeService.TENANT_AGENTS_ROOM_PREFIX + tenantId;
  }
}

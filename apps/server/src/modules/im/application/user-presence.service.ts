import { Injectable } from '@nestjs/common';

interface OnlineSocketIdentity {
  userId: string;
  tenantId: string | null;
}

/**
 * 当前服务实例的通用在线状态表。
 * 以 socket 为粒度登记，多标签页/多设备任一连接存活即视为在线。
 */
@Injectable()
export class UserPresenceService {
  private readonly sockets = new Map<string, OnlineSocketIdentity>();

  register(socketId: string, userId: string, tenantId: string | null): void {
    this.sockets.set(socketId, { userId, tenantId });
  }

  unregister(socketId: string): void {
    this.sockets.delete(socketId);
  }

  isOnline(userId: string, tenantId: string | null): boolean {
    for (const identity of this.sockets.values()) {
      if (identity.userId === userId && identity.tenantId === tenantId) {
        return true;
      }
    }
    return false;
  }

  onlineUserIds(userIds: string[], tenantId: string | null): Set<string> {
    const requested = new Set(userIds.filter(Boolean));
    const online = new Set<string>();
    if (requested.size === 0) {
      return online;
    }
    for (const identity of this.sockets.values()) {
      if (identity.tenantId === tenantId && requested.has(identity.userId)) {
        online.add(identity.userId);
      }
    }
    return online;
  }
}

import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessage, IM_EVENTS, MarkReadPayload, PERMS, SendMessagePayload } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { TraceContextService } from '../../../observability/application/trace-context.service';
import { PermissionResolver } from '../../../rbac/application/permission-resolver.service';
import { TenantResolver } from '../../../rbac/application/tenant-resolver.service';
import { TokenService } from '../../../rbac/application/token.service';
import { ChatRealtimeService } from '../../application/chat-realtime.service';
import { UserPresenceService } from '../../application/user-presence.service';
import { ConversationAccessService } from '../../application/conversation-access.service';
import { GetHistoryUseCase } from '../../application/use-cases/get-history.usecase';
import { MarkReadUseCase } from '../../application/use-cases/mark-read.usecase';
import { SendMessageUseCase } from '../../application/use-cases/send-message.usecase';
import { extractToken } from './ws-auth';

/** 握手鉴权后注入到连接上的登录身份 */
interface AuthedSocket extends Socket {
  data: { userId: string; tenantId: string | null; isSuper: boolean };
}

/**
 * IM 网关。
 * 握手阶段复用 RBAC 访问令牌校验身份并加入个人房间（用于会话变更推送）。
 * 进房/发消息均做会话成员校验；坐席可订阅客服队列房间接收待接入推送。
 */
@WebSocketGateway({ namespace: '/im', cors: { origin: '*' } })
export class ImGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ImGateway.name);

  /** 连接 → 握手鉴权完成信号：消息处理前先等待，避免身份未就绪导致误判无权限 */
  private readonly authReady = new WeakMap<Socket, Promise<void>>();

  constructor(
    private readonly tokens: TokenService,
    private readonly permissions: PermissionResolver,
    private readonly tenants: TenantResolver,
    private readonly sendMessage: SendMessageUseCase,
    private readonly getHistory: GetHistoryUseCase,
    private readonly markRead: MarkReadUseCase,
    private readonly access: ConversationAccessService,
    private readonly realtime: ChatRealtimeService,
    private readonly presence: UserPresenceService,
    private readonly trace: TraceContextService,
    private readonly tenant: TenantContextService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bind(server);
  }

  /**
   * 在独立链路上下文中执行 WS 消息处理。
   * 每次消息生成新的 traceId/spanId，并带上握手身份，使 WS 行为与 HTTP 一致可追踪。
   */
  private async runInTrace<T>(
    socket: AuthedSocket,
    deniedValue: T,
    handler: () => Promise<T>,
  ): Promise<T> {
    await this.authReady.get(socket);
    if (!socket.connected) {
      return deniedValue;
    }
    try {
      await this.assertCurrentIdentity(socket);
    } catch {
      this.deny(socket, '账号或所属租户已失效，请重新登录');
      return deniedValue;
    }
    return this.trace.run(
      {
        traceId: TraceContextService.newTraceId(),
        spanId: TraceContextService.newSpanId(),
        userId: socket.data?.userId ?? null,
        username: null,
      },
      () =>
        this.tenant.run(
          {
            tenantId: socket.data?.tenantId ?? null,
            isSuper: socket.data?.isSuper ?? false,
          },
          handler,
        ),
    );
  }

  /** 每个入站事件重新读取账号和租户，避免旧连接继续沿用失效身份。 */
  private async assertCurrentIdentity(socket: AuthedSocket): Promise<void> {
    const auth = await this.permissions.resolve(socket.data.userId);
    if (
      !auth.enabled ||
      !auth.tenantId ||
      auth.tenantId !== socket.data.tenantId ||
      auth.isSuper !== socket.data.isSuper
    ) {
      throw new Error('连接身份已失效');
    }
    await this.tenants.assertTenantEnabled(auth.tenantId);
  }

  handleConnection(socket: Socket): Promise<void> {
    const ready = this.authenticate(socket);
    this.authReady.set(socket, ready);
    return ready;
  }

  /** 握手鉴权：校验访问令牌、解析超管标识并加入个人房间，失败则断开连接 */
  private async authenticate(socket: Socket): Promise<void> {
    const token = extractToken(socket);
    if (!token) {
      this.deny(socket, '缺少访问令牌');
      return;
    }
    try {
      const payload = await this.tokens.verifyAccess(token);
      const auth = await this.permissions.resolve(payload.sub);
      if (
        payload.type !== 'access' ||
        !auth.enabled ||
        !auth.tenantId ||
        auth.tenantId !== payload.tenantId
      ) {
        throw new Error('访问令牌对应的用户或租户无效');
      }
      await this.tenants.assertTenantEnabled(auth.tenantId);
      (socket as AuthedSocket).data = {
        userId: payload.sub,
        tenantId: auth.tenantId,
        isSuper: auth.isSuper,
      };
      await socket.join(this.realtime.userRoom(payload.sub));
      if (!socket.connected) {
        return;
      }
      this.presence.register(socket.id, payload.sub, auth.tenantId);
      this.logger.debug(`IM 连接已鉴权：${payload.sub}`);
    } catch {
      this.deny(socket, '访问令牌无效或已过期');
    }
  }

  handleDisconnect(socket: Socket): void {
    this.realtime.unregisterAgent(socket.id);
    this.presence.unregister(socket.id);
  }

  @SubscribeMessage(IM_EVENTS.join)
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() conversationId: string,
  ): Promise<ChatMessage[]> {
    return this.runInTrace<ChatMessage[]>(socket, [], async () => {
      if (!conversationId) {
        return [];
      }
      try {
        await this.access.assertMember(conversationId, socket.data.userId);
      } catch (error) {
        this.emitError(socket, error, '无权进入该会话');
        return [];
      }
      await socket.join(this.realtime.conversationRoom(conversationId));
      const history = await this.getHistory.execute(conversationId);
      socket.emit(IM_EVENTS.joined, { conversationId });
      return history;
    });
  }

  @SubscribeMessage(IM_EVENTS.send)
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    await this.runInTrace<void>(socket, undefined, async () => {
      try {
        const message = await this.sendMessage.execute(payload, socket.data.userId);
        await this.markRead.execute(message.conversationId, socket.data.userId, message.id);
        this.realtime.emitToConversation(message.conversationId, IM_EVENTS.receive, message);
      } catch (error) {
        this.emitError(socket, error, '发送失败');
      }
    });
  }

  /** 活动页面确认消息可见后显式推进已读位点，避免轮询时未读数反弹。 */
  @SubscribeMessage(IM_EVENTS.markRead)
  async onMarkRead(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: MarkReadPayload,
  ): Promise<boolean> {
    return this.runInTrace<boolean>(socket, false, async () => {
      if (
        !payload ||
        typeof payload.conversationId !== 'string' ||
        typeof payload.messageId !== 'string' ||
        !payload.conversationId ||
        !payload.messageId
      ) {
        return false;
      }
      try {
        await this.access.assertMember(payload.conversationId, socket.data.userId);
        await this.markRead.execute(payload.conversationId, socket.data.userId, payload.messageId);
        return true;
      } catch (error) {
        this.emitError(socket, error, '标记已读失败');
        return false;
      }
    });
  }

  /** 管理端布局只观察队列变化，不进入自动分配在线索引。 */
  @SubscribeMessage(IM_EVENTS.observeService)
  async onObserveService(@ConnectedSocket() socket: AuthedSocket): Promise<void> {
    await this.runInTrace<void>(socket, undefined, () => this.subscribeService(socket, false));
  }

  /** 客服工作台订阅队列：校验权限后加入租户房间并登记在线。 */
  @SubscribeMessage(IM_EVENTS.watchService)
  async onWatchService(@ConnectedSocket() socket: AuthedSocket): Promise<void> {
    await this.runInTrace<void>(socket, undefined, () => this.subscribeService(socket, true));
  }

  private async subscribeService(
    socket: AuthedSocket,
    registerForAssignment: boolean,
  ): Promise<void> {
    const context = await this.permissions.resolve(socket.data.userId);
    const allowed = context.isSuper || context.permissions.includes(PERMS.im.serviceAgent);
    if (!allowed) {
      socket.emit(IM_EVENTS.error, { message: '无客服坐席权限' });
      return;
    }
    const room = this.realtime.agentsRoom(socket.data.tenantId, context.isSuper);
    if (!room) {
      socket.emit(IM_EVENTS.error, { message: '缺少租户上下文' });
      return;
    }
    await socket.join(room);
    if (registerForAssignment) {
      this.realtime.registerAgent(
        socket.id,
        socket.data.userId,
        socket.data.tenantId,
        context.isSuper,
      );
    }
  }

  private emitError(socket: Socket, error: unknown, fallback: string): void {
    socket.emit(IM_EVENTS.error, {
      message: error instanceof Error ? error.message : fallback,
    });
  }

  private deny(socket: Socket, reason: string): void {
    this.realtime.unregisterAgent(socket.id);
    this.presence.unregister(socket.id);
    socket.emit(IM_EVENTS.error, { message: reason });
    socket.disconnect(true);
  }
}

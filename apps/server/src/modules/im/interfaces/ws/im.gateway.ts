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
import { ChatMessage, IM_EVENTS, PERMS, SendMessagePayload } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { TraceContextService } from '../../../observability/application/trace-context.service';
import { PermissionResolver } from '../../../rbac/application/permission-resolver.service';
import { TokenService } from '../../../rbac/application/token.service';
import { ChatRealtimeService } from '../../application/chat-realtime.service';
import { ConversationAccessService } from '../../application/conversation-access.service';
import { GetHistoryUseCase } from '../../application/use-cases/get-history.usecase';
import { MarkReadUseCase } from '../../application/use-cases/mark-read.usecase';
import { SendMessageUseCase } from '../../application/use-cases/send-message.usecase';
import { extractToken } from './ws-auth';

/** 握手鉴权后注入到连接上的登录身份 */
interface AuthedSocket extends Socket {
  data: { userId: string; username: string; tenantId: string | null; isSuper: boolean };
}

/**
 * IM 网关。
 * 握手阶段复用 RBAC 访问令牌校验身份并加入个人房间（用于会话变更推送）。
 * 进房/发消息均做会话成员校验；坐席可订阅客服队列房间接收待接入推送。
 */
@WebSocketGateway({ namespace: '/im', cors: { origin: '*' } })
export class ImGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ImGateway.name);

  constructor(
    private readonly tokens: TokenService,
    private readonly permissions: PermissionResolver,
    private readonly sendMessage: SendMessageUseCase,
    private readonly getHistory: GetHistoryUseCase,
    private readonly markRead: MarkReadUseCase,
    private readonly access: ConversationAccessService,
    private readonly realtime: ChatRealtimeService,
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
  private runInTrace<T>(socket: AuthedSocket, handler: () => Promise<T>): Promise<T> {
    return this.trace.run(
      {
        traceId: TraceContextService.newTraceId(),
        spanId: TraceContextService.newSpanId(),
        userId: socket.data?.userId ?? null,
        username: socket.data?.username ?? null,
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

  async handleConnection(socket: Socket): Promise<void> {
    const token = extractToken(socket);
    if (!token) {
      this.deny(socket, '缺少访问令牌');
      return;
    }
    try {
      const payload = await this.tokens.verifyAccess(token);
      const auth = await this.permissions.resolve(payload.sub);
      (socket as AuthedSocket).data = {
        userId: payload.sub,
        username: payload.username,
        tenantId: payload.tenantId ?? null,
        isSuper: auth.isSuper,
      };
      await socket.join(this.realtime.userRoom(payload.sub));
      this.logger.debug(`IM 连接已鉴权：${payload.username}`);
    } catch {
      this.deny(socket, '访问令牌无效或已过期');
    }
  }

  handleDisconnect(socket: Socket): void {
    this.realtime.unregisterAgent(socket.id);
  }

  @SubscribeMessage(IM_EVENTS.join)
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() conversationId: string,
  ): Promise<ChatMessage[]> {
    return this.runInTrace(socket, async () => {
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
      await this.markRead.execute(conversationId, socket.data.userId);
      socket.emit(IM_EVENTS.joined, { conversationId });
      return this.getHistory.execute(conversationId);
    });
  }

  @SubscribeMessage(IM_EVENTS.send)
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    await this.runInTrace(socket, async () => {
      try {
        const message = await this.sendMessage.execute(
          payload,
          socket.data.userId,
        );
        await this.markRead.execute(message.conversationId, socket.data.userId);
        this.realtime.emitToConversation(
          message.conversationId,
          IM_EVENTS.receive,
          message,
        );
      } catch (error) {
        this.emitError(socket, error, '发送失败');
      }
    });
  }

  /** 坐席订阅客服队列：校验权限后加入坐席房间并登记在线 */
  @SubscribeMessage(IM_EVENTS.watchService)
  async onWatchService(@ConnectedSocket() socket: AuthedSocket): Promise<void> {
    await this.runInTrace(socket, async () => {
      const context = await this.permissions.resolve(socket.data.userId);
      const allowed =
        context.isSuper || context.permissions.includes(PERMS.im.serviceAgent);
      if (!allowed) {
        socket.emit(IM_EVENTS.error, { message: '无客服坐席权限' });
        return;
      }
      await socket.join(this.realtime.agentsRoom());
      this.realtime.registerAgent(socket.id, socket.data.userId);
    });
  }

  private emitError(socket: Socket, error: unknown, fallback: string): void {
    socket.emit(IM_EVENTS.error, {
      message: error instanceof Error ? error.message : fallback,
    });
  }

  private deny(socket: Socket, reason: string): void {
    socket.emit(IM_EVENTS.error, { message: reason });
    socket.disconnect(true);
  }
}

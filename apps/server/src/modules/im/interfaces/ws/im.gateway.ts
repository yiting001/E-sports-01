import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessage, IM_EVENTS, SendMessagePayload } from '@app/contracts';
import { TokenService } from '../../../rbac/application/token.service';
import { GetHistoryUseCase } from '../../application/use-cases/get-history.usecase';
import { SendMessageUseCase } from '../../application/use-cases/send-message.usecase';
import { extractToken } from './ws-auth';

/** 握手鉴权后注入到连接上的登录身份 */
interface AuthedSocket extends Socket {
  data: { userId: string; username: string };
}

/**
 * IM 网关。
 * 握手阶段复用 RBAC 访问令牌校验身份；客户端 join 会话房间后即可收发消息，
 * 消息持久化后按会话房间广播。会话维度为后续群聊、客服功能预留扩展点。
 */
@WebSocketGateway({ namespace: '/im', cors: { origin: '*' } })
export class ImGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ImGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly sendMessage: SendMessageUseCase,
    private readonly getHistory: GetHistoryUseCase,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = extractToken(socket);
    if (!token) {
      this.deny(socket, '缺少访问令牌');
      return;
    }
    try {
      const payload = await this.tokens.verifyAccess(token);
      (socket as AuthedSocket).data = {
        userId: payload.sub,
        username: payload.username,
      };
      this.logger.debug(`IM 连接已鉴权：${payload.username}`);
    } catch {
      this.deny(socket, '访问令牌无效或已过期');
    }
  }

  @SubscribeMessage(IM_EVENTS.join)
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() conversationId: string,
  ): Promise<ChatMessage[]> {
    if (!conversationId) {
      return [];
    }
    await socket.join(this.room(conversationId));
    socket.emit(IM_EVENTS.joined, { conversationId });
    return this.getHistory.execute(conversationId);
  }

  @SubscribeMessage(IM_EVENTS.send)
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    try {
      const message = await this.sendMessage.execute(
        payload,
        socket.data.userId,
      );
      await socket.join(this.room(message.conversationId));
      this.server
        .to(this.room(message.conversationId))
        .emit(IM_EVENTS.receive, message);
    } catch (error) {
      socket.emit(IM_EVENTS.error, {
        message: error instanceof Error ? error.message : '发送失败',
      });
    }
  }

  private room(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private deny(socket: Socket, reason: string): void {
    socket.emit(IM_EVENTS.error, { message: reason });
    socket.disconnect(true);
  }
}

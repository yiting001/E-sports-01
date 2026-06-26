import { Inject, Injectable } from '@nestjs/common';
import { IM_EVENTS, MessageType, SYSTEM_SENDER_ID } from '@app/contracts';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../domain/message-repository.interface';
import { ChatMessageEntity } from '../domain/message.entity';
import { toChatMessage } from './message.mapper';
import { ChatRealtimeService } from './chat-realtime.service';

/**
 * 系统消息服务。
 * 把「xx 加入群聊 / 坐席已接入」等系统提示持久化为 system 类型消息并广播，
 * 让系统提示与普通消息走同一条历史与渲染链路。
 */
@Injectable()
export class SystemMessageService {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async post(conversationId: string, content: string): Promise<void> {
    const entity = new ChatMessageEntity();
    entity.conversationId = conversationId;
    entity.senderId = SYSTEM_SENDER_ID;
    entity.type = MessageType.System;
    entity.content = content;
    const saved = await this.messages.save(entity);
    this.realtime.emitToConversation(
      conversationId,
      IM_EVENTS.receive,
      toChatMessage(saved),
    );
  }
}

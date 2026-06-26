import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ChatMessage, SendMessagePayload } from '@app/contracts';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message-repository.interface';
import { ChatMessageEntity } from '../../domain/message.entity';
import { toChatMessage } from '../message.mapper';

/** 用例：校验并持久化一条消息，返回可广播的消息体 */
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
  ) {}

  async execute(
    payload: SendMessagePayload,
    senderId: string,
  ): Promise<ChatMessage> {
    const content = payload?.content?.trim();
    if (!payload?.conversationId || !content) {
      throw new BadRequestException('会话与消息内容不能为空');
    }
    const entity = new ChatMessageEntity();
    entity.conversationId = payload.conversationId;
    entity.senderId = senderId;
    entity.type = payload.type;
    entity.content = content;
    const saved = await this.repo.save(entity);
    return toChatMessage(saved);
  }
}

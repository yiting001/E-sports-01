import { Inject, Injectable, Logger } from '@nestjs/common';
import { IM_EVENTS, MessageType, SYSTEM_SENDER_ID } from '@app/contracts';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../domain/conversation-member-repository.interface';
import { MESSAGE_REPOSITORY, MessageRepository } from '../domain/message-repository.interface';
import { ChatMessageEntity } from '../domain/message.entity';
import { toChatMessage } from './message.mapper';
import { ChatRealtimeService } from './chat-realtime.service';

const HTML_TEXT_REPLACEMENTS: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** 把动态系统文案编码为 HTML 纯文本，避免富文本渲染时解释用户输入。 */
export function escapeSystemMessageText(content: string): string {
  return content.replace(/[&<>"']/g, (character) => HTML_TEXT_REPLACEMENTS[character] ?? character);
}

/**
 * 系统消息服务。
 * 把「xx 加入群聊 / 坐席已接入」等系统提示持久化为 system 类型消息并广播，
 * 让系统提示与普通消息走同一条历史与渲染链路。
 */
@Injectable()
export class SystemMessageService {
  private readonly logger = new Logger(SystemMessageService.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async post(conversationId: string, content: string): Promise<void> {
    const entity = new ChatMessageEntity();
    entity.conversationId = conversationId;
    entity.senderId = SYSTEM_SENDER_ID;
    entity.type = MessageType.System;
    entity.content = content;
    const saved = await this.messages.save(entity);
    await this.notifyUnreadChanged(conversationId);
    this.realtime.emitToConversation(conversationId, IM_EVENTS.receive, toChatMessage(saved));
  }

  /** 写入包含昵称、群名等动态字段的纯文本系统提示。 */
  async postText(conversationId: string, content: string): Promise<void> {
    await this.post(conversationId, escapeSystemMessageText(content));
  }

  /** 系统消息同样计入未读；信号失败时由 30 秒轮询降级发现。 */
  private async notifyUnreadChanged(conversationId: string): Promise<void> {
    try {
      const members = await this.members.findByConversation(conversationId);
      for (const member of members) {
        this.realtime.emitToUser(member.userId, IM_EVENTS.unreadChanged, null);
      }
    } catch {
      this.logger.warn('系统消息已持久化，但未读刷新信号发送失败');
    }
  }
}

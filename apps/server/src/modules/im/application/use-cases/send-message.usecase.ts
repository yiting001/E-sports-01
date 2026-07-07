import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ChatMessage,
  MessageReplyPreview,
  MessageType,
  SendMessagePayload,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message-repository.interface';
import { ChatMessageEntity } from '../../domain/message.entity';
import { toChatMessage } from '../message.mapper';
import { ConversationAccessService } from '../conversation-access.service';

/** 引用快照中文本内容的最大长度，超出截断（媒体消息存 URL 不截断） */
const REPLY_PREVIEW_MAX_LENGTH = 120;

/** 用例：成员校验 → 持久化一条消息（含 @提及与引用快照），返回可广播的消息体 */
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repo: MessageRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly access: ConversationAccessService,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    payload: SendMessagePayload,
    senderId: string,
  ): Promise<ChatMessage> {
    const content = payload?.content?.trim();
    if (!payload?.conversationId || !content) {
      throw new BadRequestException('会话与消息内容不能为空');
    }
    if (payload.type === MessageType.System) {
      throw new BadRequestException('系统消息不可由客户端发送');
    }
    await this.access.assertMember(payload.conversationId, senderId);
    const entity = new ChatMessageEntity();
    entity.conversationId = payload.conversationId;
    entity.senderId = senderId;
    entity.type = payload.type;
    entity.content = content;
    entity.mentions = await this.resolveMentions(
      payload.conversationId,
      payload.mentions,
    );
    entity.replyTo = await this.resolveReply(
      payload.conversationId,
      payload.replyToId,
    );
    const saved = await this.repo.save(entity);
    return toChatMessage(saved);
  }

  /** 提及列表去重后仅保留会话成员，为空则存 null */
  private async resolveMentions(
    conversationId: string,
    mentions?: string[],
  ): Promise<string[] | null> {
    if (!Array.isArray(mentions) || mentions.length === 0) {
      return null;
    }
    const memberRows = await this.members.findByConversation(conversationId);
    const memberIds = new Set(memberRows.map((m) => m.userId));
    const valid = [...new Set(mentions)].filter((id) => memberIds.has(id));
    return valid.length > 0 ? valid : null;
  }

  /** 校验被引用消息属于同一会话，并冻结其发送者与内容快照 */
  private async resolveReply(
    conversationId: string,
    replyToId?: string,
  ): Promise<MessageReplyPreview | null> {
    if (!replyToId) {
      return null;
    }
    const target = await this.repo.findById(replyToId);
    if (!target || target.conversationId !== conversationId) {
      throw new BadRequestException('引用的消息不存在或不属于该会话');
    }
    const names = await this.users.resolveNames([target.senderId]);
    const preview =
      target.type === MessageType.Text
        ? target.content.slice(0, REPLY_PREVIEW_MAX_LENGTH)
        : target.content;
    return {
      id: target.id,
      senderId: target.senderId,
      senderName: names.get(target.senderId) ?? target.senderId,
      type: target.type,
      content: preview,
    };
  }
}

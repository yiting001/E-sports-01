import { Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  ConversationMemberRole,
  ConversationStatus,
  ConversationType,
  ConversationView,
  IM_EVENTS,
  ServiceQueueItemView,
  StartServicePayload,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { ConversationEntity } from '../../domain/conversation.entity';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';
import {
  CONVERSATION_MEMBER_REPOSITORY,
  ConversationMemberRepository,
} from '../../domain/conversation-member-repository.interface';
import { buildMember } from '../member.factory';
import { ChatRealtimeService } from '../chat-realtime.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ConversationNotifier } from '../conversation-notifier.service';
import { ServiceAssignmentService } from '../service-assignment.service';

const DEFAULT_SUBJECT = '咨询';

/** 用例：访客发起客服会话，进入待接入队列；按配置可自动分配在线坐席 */
@Injectable()
export class StartServiceUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(CONVERSATION_MEMBER_REPOSITORY)
    private readonly members: ConversationMemberRepository,
    private readonly config: ConfigService,
    private readonly users: UserDirectory,
    private readonly realtime: ChatRealtimeService,
    private readonly assembler: ConversationViewAssembler,
    private readonly notifier: ConversationNotifier,
    private readonly assignment: ServiceAssignmentService,
  ) {}

  async execute(
    visitorId: string,
    payload: StartServicePayload,
  ): Promise<ConversationView> {
    const subject = payload?.subject?.trim() || DEFAULT_SUBJECT;
    const visitorName = await this.visitorName(visitorId);

    const conversation = await this.conversations.save(
      this.newService(visitorId, subject, visitorName),
    );
    await this.members.saveMany([
      buildMember(conversation.id, visitorId, ConversationMemberRole.Owner),
    ]);
    await this.notifier.pushToMembers(conversation, [visitorId]);

    await this.dispatch(conversation, visitorId, visitorName, subject);
    const latest =
      (await this.conversations.findById(conversation.id)) ?? conversation;
    return this.assembler.toView(latest, visitorId);
  }

  /** 自动分配在线坐席，否则入队并通知坐席 */
  private async dispatch(
    conversation: ConversationEntity,
    visitorId: string,
    visitorName: string,
    subject: string,
  ): Promise<void> {
    const autoAssign = await this.config.getBoolean(
      CONFIG_KEYS.im.serviceAutoAssign,
      false,
    );
    const agents = this.realtime.onlineAgents();
    if (autoAssign && agents.length > 0) {
      await this.assignment.attachAgent(conversation, agents[0]);
      return;
    }
    const item: ServiceQueueItemView = {
      conversationId: conversation.id,
      visitorId,
      visitorName,
      subject,
      waitingSince: conversation.createdAt.getTime(),
    };
    this.realtime.emitToAgents(IM_EVENTS.serviceQueued, item);
  }

  private async visitorName(visitorId: string): Promise<string> {
    const names = await this.users.resolveNames([visitorId]);
    return names.get(visitorId) ?? visitorId;
  }

  private newService(
    visitorId: string,
    subject: string,
    visitorName: string,
  ): ConversationEntity {
    const conversation = new ConversationEntity();
    conversation.type = ConversationType.Service;
    conversation.title = `客服 · ${visitorName}`;
    conversation.ownerId = visitorId;
    conversation.status = ConversationStatus.Pending;
    conversation.subject = subject;
    return conversation;
  }
}

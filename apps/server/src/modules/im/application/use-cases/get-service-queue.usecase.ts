import { Inject, Injectable } from '@nestjs/common';
import { ServiceQueueItemView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  CONVERSATION_REPOSITORY,
  ConversationRepository,
} from '../../domain/conversation-repository.interface';

/** 用例：坐席查询待接入客服队列（先到先服务） */
@Injectable()
export class GetServiceQueueUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(): Promise<ServiceQueueItemView[]> {
    const waiting = await this.conversations.findWaitingService();
    const visitorIds = waiting
      .map((c) => c.ownerId)
      .filter((id): id is string => Boolean(id));
    const names = await this.users.resolveNames(visitorIds);
    return waiting.map((c) => ({
      conversationId: c.id,
      visitorId: c.ownerId ?? '',
      visitorName: c.ownerId ? names.get(c.ownerId) ?? c.ownerId : '访客',
      subject: c.subject,
      waitingSince: c.createdAt.getTime(),
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { ConversationDetailView } from '@app/contracts';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';

/** 用例：查看会话详情（含成员清单），需为会话成员 */
@Injectable()
export class GetConversationDetailUseCase {
  constructor(
    private readonly access: ConversationAccessService,
    private readonly assembler: ConversationViewAssembler,
  ) {}

  async execute(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDetailView> {
    await this.access.assertMember(conversationId, userId);
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    return this.assembler.toDetail(conversation, userId);
  }
}

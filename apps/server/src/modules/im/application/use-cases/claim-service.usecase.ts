import { BadRequestException, Injectable } from '@nestjs/common';
import { ConversationType, ConversationView } from '@app/contracts';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ServiceAssignmentService } from '../service-assignment.service';

/** 用例：坐席主动认领一通待接入的客服会话 */
@Injectable()
export class ClaimServiceUseCase {
  constructor(
    private readonly access: ConversationAccessService,
    private readonly assignment: ServiceAssignmentService,
    private readonly assembler: ConversationViewAssembler,
  ) {}

  async execute(
    conversationId: string,
    agentId: string,
  ): Promise<ConversationView> {
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Service) {
      throw new BadRequestException('该会话不是客服会话');
    }
    await this.assignment.attachAgent(conversation, agentId);
    return this.assembler.toView(conversation, agentId);
  }
}

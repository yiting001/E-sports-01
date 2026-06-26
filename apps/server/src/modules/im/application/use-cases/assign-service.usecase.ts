import { BadRequestException, Injectable } from '@nestjs/common';
import { ConversationType, ConversationView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { ConversationAccessService } from '../conversation-access.service';
import { ConversationViewAssembler } from '../conversation-view.assembler';
import { ServiceAssignmentService } from '../service-assignment.service';

/** 用例：管理员把待接入客服会话强制指派给指定坐席 */
@Injectable()
export class AssignServiceUseCase {
  constructor(
    private readonly access: ConversationAccessService,
    private readonly assignment: ServiceAssignmentService,
    private readonly assembler: ConversationViewAssembler,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    conversationId: string,
    agentId: string,
    operatorId: string,
  ): Promise<ConversationView> {
    const conversation =
      await this.access.getConversationOrFail(conversationId);
    if (conversation.type !== ConversationType.Service) {
      throw new BadRequestException('该会话不是客服会话');
    }
    const briefs = await this.users.findBriefs([agentId]);
    if (briefs.length === 0) {
      throw new BadRequestException('指定的坐席不存在');
    }
    await this.assignment.attachAgent(conversation, agentId);
    return this.assembler.toView(conversation, operatorId);
  }
}

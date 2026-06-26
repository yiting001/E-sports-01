import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { ObservabilityModule } from '../observability/observability.module';

import { ChatMessageEntity } from './domain/message.entity';
import { ConversationEntity } from './domain/conversation.entity';
import { ConversationMemberEntity } from './domain/conversation-member.entity';
import { MESSAGE_REPOSITORY } from './domain/message-repository.interface';
import { CONVERSATION_REPOSITORY } from './domain/conversation-repository.interface';
import { CONVERSATION_MEMBER_REPOSITORY } from './domain/conversation-member-repository.interface';
import { TypeormMessageRepository } from './infrastructure/message.repository';
import { TypeormConversationRepository } from './infrastructure/conversation.repository';
import { TypeormConversationMemberRepository } from './infrastructure/conversation-member.repository';

import { ChatRealtimeService } from './application/chat-realtime.service';
import { SystemMessageService } from './application/system-message.service';
import { ConversationAccessService } from './application/conversation-access.service';
import { ConversationViewAssembler } from './application/conversation-view.assembler';
import { ConversationNotifier } from './application/conversation-notifier.service';
import { ServiceAssignmentService } from './application/service-assignment.service';

import { GetHistoryUseCase } from './application/use-cases/get-history.usecase';
import { SendMessageUseCase } from './application/use-cases/send-message.usecase';
import { MarkReadUseCase } from './application/use-cases/mark-read.usecase';
import { CreateGroupUseCase } from './application/use-cases/create-group.usecase';
import { ListConversationsUseCase } from './application/use-cases/list-conversations.usecase';
import { GetConversationDetailUseCase } from './application/use-cases/get-conversation-detail.usecase';
import { AddMembersUseCase } from './application/use-cases/add-members.usecase';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.usecase';
import { LeaveConversationUseCase } from './application/use-cases/leave-conversation.usecase';
import { RenameGroupUseCase } from './application/use-cases/rename-group.usecase';
import { OpenPrivateUseCase } from './application/use-cases/open-private.usecase';
import { StartServiceUseCase } from './application/use-cases/start-service.usecase';
import { GetServiceQueueUseCase } from './application/use-cases/get-service-queue.usecase';
import { ClaimServiceUseCase } from './application/use-cases/claim-service.usecase';
import { AssignServiceUseCase } from './application/use-cases/assign-service.usecase';
import { CloseServiceUseCase } from './application/use-cases/close-service.usecase';

import { ImGateway } from './interfaces/ws/im.gateway';
import { MessageHistoryController } from './interfaces/controllers/message.history.controller';
import { ConversationCreateController } from './interfaces/controllers/conversation.create.controller';
import { ConversationListController } from './interfaces/controllers/conversation.list.controller';
import { ConversationOpenPrivateController } from './interfaces/controllers/conversation.open-private.controller';
import { ConversationDetailController } from './interfaces/controllers/conversation.detail.controller';
import { ConversationAddMembersController } from './interfaces/controllers/conversation.add-members.controller';
import { ConversationRemoveMemberController } from './interfaces/controllers/conversation.remove-member.controller';
import { ConversationLeaveController } from './interfaces/controllers/conversation.leave.controller';
import { ConversationRenameController } from './interfaces/controllers/conversation.rename.controller';
import { ServiceStartController } from './interfaces/controllers/service.start.controller';
import { ServiceQueueController } from './interfaces/controllers/service.queue.controller';
import { ServiceClaimController } from './interfaces/controllers/service.claim.controller';
import { ServiceAssignController } from './interfaces/controllers/service.assign.controller';
import { ServiceCloseController } from './interfaces/controllers/service.close.controller';

/**
 * IM 模块。
 * 以「会话 Conversation」为核心，统一私聊 / 群聊 / 客服三类场景：
 * 实时收发与持久化复用 Socket.IO 网关；进房/发消息做成员校验；
 * 群成员变更与客服接入以系统消息广播，会话变更经个人房间推送，参数全取自配置中心。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    ObservabilityModule,
    TypeOrmModule.forFeature([
      ChatMessageEntity,
      ConversationEntity,
      ConversationMemberEntity,
    ]),
  ],
  controllers: [
    MessageHistoryController,
    ConversationCreateController,
    ConversationListController,
    ConversationOpenPrivateController,
    ConversationDetailController,
    ConversationAddMembersController,
    ConversationRemoveMemberController,
    ConversationLeaveController,
    ConversationRenameController,
    ServiceStartController,
    ServiceQueueController,
    ServiceClaimController,
    ServiceAssignController,
    ServiceCloseController,
  ],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeormMessageRepository },
    { provide: CONVERSATION_REPOSITORY, useClass: TypeormConversationRepository },
    {
      provide: CONVERSATION_MEMBER_REPOSITORY,
      useClass: TypeormConversationMemberRepository,
    },
    ChatRealtimeService,
    SystemMessageService,
    ConversationAccessService,
    ConversationViewAssembler,
    ConversationNotifier,
    ServiceAssignmentService,
    GetHistoryUseCase,
    SendMessageUseCase,
    MarkReadUseCase,
    CreateGroupUseCase,
    ListConversationsUseCase,
    GetConversationDetailUseCase,
    AddMembersUseCase,
    RemoveMemberUseCase,
    LeaveConversationUseCase,
    RenameGroupUseCase,
    OpenPrivateUseCase,
    StartServiceUseCase,
    GetServiceQueueUseCase,
    ClaimServiceUseCase,
    AssignServiceUseCase,
    CloseServiceUseCase,
    ImGateway,
  ],
})
export class ImModule {}

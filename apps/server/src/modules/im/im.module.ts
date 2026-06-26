import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { RbacModule } from '../rbac/rbac.module';
import { ChatMessageEntity } from './domain/message.entity';
import { MESSAGE_REPOSITORY } from './domain/message-repository.interface';
import { TypeormMessageRepository } from './infrastructure/message.repository';
import { GetHistoryUseCase } from './application/use-cases/get-history.usecase';
import { SendMessageUseCase } from './application/use-cases/send-message.usecase';
import { ImGateway } from './interfaces/ws/im.gateway';
import { MessageHistoryController } from './interfaces/controllers/message.history.controller';

/**
 * IM 模块。
 * 提供基于 Socket.IO 的实时消息收发与持久化；
 * WS 握手复用 RBAC 访问令牌校验，历史条数等参数取自配置中心。
 */
@Module({
  imports: [
    ConfigModule,
    RbacModule,
    TypeOrmModule.forFeature([ChatMessageEntity]),
  ],
  controllers: [MessageHistoryController],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: TypeormMessageRepository },
    SendMessageUseCase,
    GetHistoryUseCase,
    ImGateway,
  ],
})
export class ImModule {}

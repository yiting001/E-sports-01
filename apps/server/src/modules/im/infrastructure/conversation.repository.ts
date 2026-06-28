import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { ConversationStatus, ConversationType } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ConversationEntity } from '../domain/conversation.entity';
import { ConversationRepository } from '../domain/conversation-repository.interface';

/** 会话仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormConversationRepository implements ConversationRepository {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly repo: Repository<ConversationEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  save(conversation: ConversationEntity): Promise<ConversationEntity> {
    return this.repo.save(conversation);
  }

  findById(id: string): Promise<ConversationEntity | null> {
    return this.repo.findOne({
      where: withTenant<ConversationEntity>(this.tenant, { id }) as FindOptionsWhere<ConversationEntity>,
    });
  }

  findByIds(ids: string[]): Promise<ConversationEntity[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({
      where: withTenant<ConversationEntity>(this.tenant, { id: In(ids) }) as FindOptionsWhere<ConversationEntity>,
    });
  }

  findWaitingService(): Promise<ConversationEntity[]> {
    return this.repo.find({
      where: withTenant<ConversationEntity>(this.tenant, {
        type: ConversationType.Service,
        status: ConversationStatus.Pending,
      }) as FindOptionsWhere<ConversationEntity>,
      order: { createdAt: 'ASC' },
    });
  }
}

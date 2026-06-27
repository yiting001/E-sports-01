import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';
import { ConversationMemberRepository } from '../domain/conversation-member-repository.interface';

/** 会话成员仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormConversationMemberRepository
  implements ConversationMemberRepository
{
  constructor(
    @InjectRepository(ConversationMemberEntity)
    private readonly repo: Repository<ConversationMemberEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  saveMany(
    members: ConversationMemberEntity[],
  ): Promise<ConversationMemberEntity[]> {
    return this.repo.save(members);
  }

  findByConversation(
    conversationId: string,
  ): Promise<ConversationMemberEntity[]> {
    return this.repo.find({
      where: withTenant<ConversationMemberEntity>(this.tenant, { conversationId }) as FindOptionsWhere<ConversationMemberEntity>,
      order: { createdAt: 'ASC' },
    });
  }

  findByUser(userId: string): Promise<ConversationMemberEntity[]> {
    return this.repo.find({
      where: withTenant<ConversationMemberEntity>(this.tenant, { userId }) as FindOptionsWhere<ConversationMemberEntity>,
    });
  }

  findOne(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMemberEntity | null> {
    return this.repo.findOne({
      where: withTenant<ConversationMemberEntity>(this.tenant, { conversationId, userId }) as FindOptionsWhere<ConversationMemberEntity>,
    });
  }

  countByConversation(conversationId: string): Promise<number> {
    return this.repo.countBy(
      withTenant<ConversationMemberEntity>(this.tenant, { conversationId }) as FindOptionsWhere<ConversationMemberEntity>,
    );
  }

  async remove(conversationId: string, userId: string): Promise<void> {
    await this.repo.delete(
      withTenant<ConversationMemberEntity>(this.tenant, { conversationId, userId }) as FindOptionsWhere<ConversationMemberEntity>,
    );
  }

  async updateLastRead(
    conversationId: string,
    userId: string,
    at: Date,
  ): Promise<void> {
    await this.repo.update(
      withTenant<ConversationMemberEntity>(this.tenant, { conversationId, userId }) as FindOptionsWhere<ConversationMemberEntity>,
      { lastReadAt: at },
    );
  }
}

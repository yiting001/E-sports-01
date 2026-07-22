import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ChatMessageEntity } from '../domain/message.entity';
import { ConversationMemberEntity } from '../domain/conversation-member.entity';
import { ConversationMemberRepository } from '../domain/conversation-member-repository.interface';

/** 会话成员仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormConversationMemberRepository implements ConversationMemberRepository {
  constructor(
    @InjectRepository(ConversationMemberEntity)
    private readonly repo: Repository<ConversationMemberEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  saveMany(members: ConversationMemberEntity[]): Promise<ConversationMemberEntity[]> {
    return this.repo.save(members);
  }

  findByConversation(conversationId: string): Promise<ConversationMemberEntity[]> {
    return this.repo.find({
      where: withTenant<ConversationMemberEntity>(this.tenant, {
        conversationId,
      }) as FindOptionsWhere<ConversationMemberEntity>,
      order: { createdAt: 'ASC' },
    });
  }

  findByUser(userId: string): Promise<ConversationMemberEntity[]> {
    return this.repo.find({
      where: withTenant<ConversationMemberEntity>(this.tenant, {
        userId,
      }) as FindOptionsWhere<ConversationMemberEntity>,
    });
  }

  findOne(conversationId: string, userId: string): Promise<ConversationMemberEntity | null> {
    return this.repo.findOne({
      where: withTenant<ConversationMemberEntity>(this.tenant, {
        conversationId,
        userId,
      }) as FindOptionsWhere<ConversationMemberEntity>,
    });
  }

  countByConversation(conversationId: string): Promise<number> {
    return this.repo.countBy(
      withTenant<ConversationMemberEntity>(this.tenant, {
        conversationId,
      }) as FindOptionsWhere<ConversationMemberEntity>,
    );
  }

  async remove(conversationId: string, userId: string): Promise<void> {
    await this.repo.delete(
      withTenant<ConversationMemberEntity>(this.tenant, {
        conversationId,
        userId,
      }) as FindOptionsWhere<ConversationMemberEntity>,
    );
  }

  async updateLastReadToMessage(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<void> {
    const scope = withTenant<ConversationMemberEntity>(this.tenant, {
      conversationId,
      userId,
    }) as FindOptionsWhere<ConversationMemberEntity>;
    const cursorParams: Record<string, string> = {
      cursorConversationId: conversationId,
      cursorMessageId: messageId,
    };
    const cursorConditions = [
      'message.id = :cursorMessageId',
      'message.conversationId = :cursorConversationId',
    ];
    const tenantId = this.tenant.scopeId();
    if (tenantId) {
      cursorConditions.push('message.tenantId = :cursorTenantId');
      cursorParams.cursorTenantId = tenantId;
    }
    const cursorQuery = this.repo.manager
      .createQueryBuilder(ChatMessageEntity, 'message')
      .select('message.createdAt')
      .where(cursorConditions.join(' AND '), cursorParams);
    const cursorSql = `(${cursorQuery.getQuery()})`;
    await this.repo
      .createQueryBuilder()
      .update(ConversationMemberEntity)
      .set({ lastReadAt: () => cursorSql })
      .where(scope)
      .andWhere(`${cursorSql} IS NOT NULL`)
      .andWhere(`(last_read_at IS NULL OR last_read_at < ${cursorSql})`)
      .setParameters(cursorQuery.getParameters())
      .execute();
  }
}

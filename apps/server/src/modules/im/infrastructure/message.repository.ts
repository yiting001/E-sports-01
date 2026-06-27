import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ChatMessageEntity } from '../domain/message.entity';
import { MessageRepository } from '../domain/message-repository.interface';

/** 聊天消息仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormMessageRepository implements MessageRepository {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly repo: Repository<ChatMessageEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    return this.repo.save(message);
  }

  async findRecent(
    conversationId: string,
    limit: number,
  ): Promise<ChatMessageEntity[]> {
    const rows = await this.repo.find({
      where: withTenant<ChatMessageEntity>(this.tenant, { conversationId }) as FindOptionsWhere<ChatMessageEntity>,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }

  findLatest(conversationId: string): Promise<ChatMessageEntity | null> {
    return this.repo.findOne({
      where: withTenant<ChatMessageEntity>(this.tenant, { conversationId }) as FindOptionsWhere<ChatMessageEntity>,
      order: { createdAt: 'DESC' },
    });
  }

  countSince(conversationId: string, since: Date | null): Promise<number> {
    return this.repo.countBy(
      withTenant<ChatMessageEntity>(this.tenant, {
        conversationId,
        ...(since ? { createdAt: MoreThan(since) } : {}),
      }) as FindOptionsWhere<ChatMessageEntity>,
    );
  }
}

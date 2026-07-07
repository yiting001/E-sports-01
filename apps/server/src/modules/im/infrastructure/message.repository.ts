import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  ILike,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { FindOperator, FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ChatMessageEntity } from '../domain/message.entity';
import {
  MessageRepository,
  MessageSearchFilter,
} from '../domain/message-repository.interface';

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

  async search(
    filter: MessageSearchFilter,
  ): Promise<{ rows: ChatMessageEntity[]; total: number }> {
    const createdAt = this.dateOperator(filter.from, filter.to);
    const [rows, total] = await this.repo.findAndCount({
      where: withTenant<ChatMessageEntity>(this.tenant, {
        conversationId: filter.conversationId,
        ...(filter.keyword ? { content: ILike(`%${filter.keyword}%`) } : {}),
        ...(createdAt ? { createdAt } : {}),
      }) as FindOptionsWhere<ChatMessageEntity>,
      order: { createdAt: 'DESC' },
      skip: filter.skip,
      take: filter.take,
    });
    return { rows, total };
  }

  /** 日期范围转 TypeORM 查询算子（起止均可缺省） */
  private dateOperator(
    from?: Date,
    to?: Date,
  ): FindOperator<Date> | null {
    if (from && to) {
      return Between(from, to);
    }
    if (from) {
      return MoreThanOrEqual(from);
    }
    if (to) {
      return LessThanOrEqual(to);
    }
    return null;
  }
}

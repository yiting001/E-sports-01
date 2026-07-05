import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, type Repository } from 'typeorm';
import { OrderStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { applyTenant, withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../../order/domain/order.entity';
import { MemberProfileEntity } from '../../member/domain/member-profile.entity';
import { User } from '../../rbac/domain/user.entity';
import {
  BoosterRankRow,
  RankRepository,
  SpenderRankRow,
} from '../domain/rank-repository.interface';

/**
 * 排行榜仓储的 TypeORM 实现。
 * 只读聚合既有订单/会员档案表（不落新表），按租户上下文过滤；
 * 展示名取用户昵称，回退用户名。
 */
@Injectable()
export class TypeormRankRepository implements RankRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly members: Repository<MemberProfileEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly tenant: TenantContextService,
  ) {}

  async topBoosters(limit: number): Promise<BoosterRankRow[]> {
    const rows = await applyTenant(
      this.tenant,
      this.orders
        .createQueryBuilder('o')
        .select('o.boosterId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('o.status = :completed AND o.boosterId <> :empty', {
          completed: OrderStatus.Completed,
          empty: '',
        })
        .groupBy('o.boosterId')
        .orderBy('count', 'DESC')
        .limit(limit),
      'o',
    ).getRawMany<{ userId: string; count: string }>();
    const names = await this.displayNames(rows.map((row) => row.userId));
    return rows.map((row) => ({
      name: names.get(row.userId) ?? '',
      completedCount: Number(row.count),
    }));
  }

  async topSpenders(limit: number): Promise<SpenderRankRow[]> {
    const rows = await this.members.find({
      where: withTenant<MemberProfileEntity>(this.tenant, {
        spendFen: MoreThan(0),
      }),
      order: { spendFen: 'DESC' },
      take: limit,
    });
    const names = await this.displayNames(rows.map((row) => row.userId));
    return rows.map((row) => ({
      name: names.get(row.userId) ?? '',
      spendFen: row.spendFen,
    }));
  }

  /** 批量取用户展示名（昵称优先，回退用户名） */
  private async displayNames(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) {
      return map;
    }
    const rows = await this.users.find({ where: { id: In(userIds) } });
    for (const row of rows) {
      map.set(row.id, row.nickname || row.username);
    }
    return map;
  }
}

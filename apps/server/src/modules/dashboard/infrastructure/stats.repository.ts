import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MoreThanOrEqual } from 'typeorm';
import {
  BoosterStatus,
  FlowTrendPoint,
  FundDirection,
  NamedCount,
  OrderStatus,
  TrendPoint,
} from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { applyTenant, withTenant } from '../../../shared/tenant/tenant-scope.util';
import { OrderEntity } from '../../order/domain/order.entity';
import { WalletTransactionEntity } from '../../wallet/domain/wallet-transaction.entity';
import { User } from '../../rbac/domain/user.entity';
import { BoosterApplicationEntity } from '../../booster/domain/booster-application.entity';
import { MemberProfileEntity } from '../../member/domain/member-profile.entity';
import {
  BoosterTotals,
  OrderTotals,
  StatsRepository,
  StatsWindow,
  TxnTypeTotal,
} from '../domain/stats-repository.interface';

/** 聚合粒度 → to_char 的 bucket 标签格式（UTC） */
const BUCKET_FORMAT: Record<StatsWindow['unit'], string> = {
  day: 'YYYY-MM-DD',
  month: 'YYYY-MM',
  year: 'YYYY',
};

/**
 * 仪表盘统计仓储的 TypeORM 实现。
 * 对既有业务表做只读聚合（不做任何写入），全部查询按租户上下文过滤；
 * 趋势类查询用 to_char 按 UTC 截断到日/月/年分桶。
 */
@Injectable()
export class TypeormStatsRepository implements StatsRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly txns: Repository<WalletTransactionEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(BoosterApplicationEntity)
    private readonly boosters: Repository<BoosterApplicationEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly members: Repository<MemberProfileEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  async orderTotals(window: StatsWindow): Promise<OrderTotals> {
    const qb = applyTenant(
      this.tenant,
      this.orders
        .createQueryBuilder('o')
        .select('COUNT(*)', 'total')
        .addSelect('COUNT(*) FILTER (WHERE o.paidAt IS NOT NULL)', 'paid')
        .addSelect('COUNT(*) FILTER (WHERE o.status = :completed)', 'completed')
        .addSelect('COALESCE(SUM(o.amountFen) FILTER (WHERE o.paidAt IS NOT NULL), 0)', 'gmv')
        .addSelect(
          'COALESCE(SUM(o.originalAmountFen - o.amountFen) FILTER (WHERE o.paidAt IS NOT NULL), 0)',
          'discount',
        )
        .where('o.createdAt >= :since', { since: window.since })
        .setParameter('completed', OrderStatus.Completed),
      'o',
    );
    const row = await qb.getRawOne<{
      total: string;
      paid: string;
      completed: string;
      gmv: string;
      discount: string;
    }>();
    return {
      totalOrders: Number(row?.total ?? 0),
      paidOrders: Number(row?.paid ?? 0),
      completedOrders: Number(row?.completed ?? 0),
      gmvFen: Number(row?.gmv ?? 0),
      discountFen: Number(row?.discount ?? 0),
    };
  }

  orderTrend(window: StatsWindow): Promise<TrendPoint[]> {
    return this.trend(this.orders, 'createdAt', window, 'COUNT(*)');
  }

  gmvTrend(window: StatsWindow): Promise<TrendPoint[]> {
    return this.trend(this.orders, 'paidAt', window, 'COALESCE(SUM(t.amountFen), 0)');
  }

  async orderStatusDistribution(window: StatsWindow): Promise<NamedCount[]> {
    const rows = await applyTenant(
      this.tenant,
      this.orders
        .createQueryBuilder('o')
        .select('o.status', 'name')
        .addSelect('COUNT(*)', 'count')
        .where('o.createdAt >= :since', { since: window.since })
        .groupBy('o.status'),
      'o',
    ).getRawMany<{ name: string; count: string }>();
    return rows.map((row) => ({ name: row.name, count: Number(row.count) }));
  }

  async topProducts(window: StatsWindow, limit: number): Promise<NamedCount[]> {
    const rows = await applyTenant(
      this.tenant,
      this.orders
        .createQueryBuilder('o')
        .select('o.productTitle', 'name')
        .addSelect('COALESCE(SUM(o.quantity), 0)', 'count')
        .where('o.createdAt >= :since', { since: window.since })
        .andWhere('o.paidAt IS NOT NULL')
        .groupBy('o.productTitle')
        .orderBy('count', 'DESC')
        .limit(limit),
      'o',
    ).getRawMany<{ name: string; count: string }>();
    return rows.map((row) => ({ name: row.name, count: Number(row.count) }));
  }

  async txnTypeTotals(window: StatsWindow): Promise<TxnTypeTotal[]> {
    const rows = await applyTenant(
      this.tenant,
      this.txns
        .createQueryBuilder('t')
        .select('t.type', 'type')
        .addSelect('COALESCE(SUM(t.amountFen), 0)', 'total')
        .where('t.createdAt >= :since', { since: window.since })
        .groupBy('t.type'),
      't',
    ).getRawMany<{ type: string; total: string }>();
    return rows.map((row) => ({ type: row.type, totalFen: Number(row.total) }));
  }

  async flowTrend(window: StatsWindow): Promise<FlowTrendPoint[]> {
    const rows = await applyTenant(
      this.tenant,
      this.txns
        .createQueryBuilder('t')
        .select(`to_char(t.createdAt AT TIME ZONE 'UTC', :fmt)`, 'bucket')
        .addSelect(
          'COALESCE(SUM(t.amountFen) FILTER (WHERE t.direction = :dirIn), 0)',
          'infen',
        )
        .addSelect(
          'COALESCE(SUM(t.amountFen) FILTER (WHERE t.direction = :dirOut), 0)',
          'outfen',
        )
        .where('t.createdAt >= :since', { since: window.since })
        .setParameters({
          fmt: BUCKET_FORMAT[window.unit],
          dirIn: FundDirection.In,
          dirOut: FundDirection.Out,
        })
        .groupBy('bucket')
        .orderBy('bucket', 'ASC'),
      't',
    ).getRawMany<{ bucket: string; infen: string; outfen: string }>();
    return rows.map((row) => ({
      bucket: row.bucket,
      inFen: Number(row.infen),
      outFen: Number(row.outfen),
    }));
  }

  totalUsers(): Promise<number> {
    return this.users.count({ where: withTenant<User>(this.tenant) });
  }

  newUsers(window: StatsWindow): Promise<number> {
    return this.users.count({
      where: withTenant<User>(this.tenant, { createdAt: MoreThanOrEqual(window.since) }),
    });
  }

  userTrend(window: StatsWindow): Promise<TrendPoint[]> {
    return this.trend(this.users, 'createdAt', window, 'COUNT(*)');
  }

  countMembersBySpend(minFen: number, maxFen: number | null): Promise<number> {
    const qb = applyTenant(
      this.tenant,
      this.members
        .createQueryBuilder('m')
        .where('m.spendFen >= :minFen', { minFen }),
      'm',
    );
    if (maxFen !== null) {
      qb.andWhere('m.spendFen < :maxFen', { maxFen });
    }
    return qb.getCount();
  }

  async boosterTotals(window: StatsWindow): Promise<BoosterTotals> {
    const [totalBoosters, pendingBoosters, newApplications] = await Promise.all([
      this.boosters.count({
        where: withTenant<BoosterApplicationEntity>(this.tenant, {
          status: BoosterStatus.Approved,
        }),
      }),
      this.boosters.count({
        where: withTenant<BoosterApplicationEntity>(this.tenant, {
          status: BoosterStatus.Pending,
        }),
      }),
      this.boosters.count({
        where: withTenant<BoosterApplicationEntity>(this.tenant, {
          createdAt: MoreThanOrEqual(window.since),
        }),
      }),
    ]);
    return { totalBoosters, pendingBoosters, newApplications };
  }

  applicationTrend(window: StatsWindow): Promise<TrendPoint[]> {
    return this.trend(this.boosters, 'createdAt', window, 'COUNT(*)');
  }

  countBoostersByCompleted(min: number, max: number | null): Promise<number> {
    const qb = applyTenant(
      this.tenant,
      this.boosters
        .createQueryBuilder('b')
        .where('b.status = :approved', { approved: BoosterStatus.Approved })
        .andWhere('b.completedOrders >= :min', { min }),
      'b',
    );
    if (max !== null) {
      qb.andWhere('b.completedOrders < :max', { max });
    }
    return qb.getCount();
  }

  /** 通用趋势聚合：按时间列 to_char 分桶后求值（COUNT 或 SUM 表达式） */
  private async trend<T extends { createdAt: Date }>(
    repo: Repository<T>,
    timeColumn: 'createdAt' | 'paidAt',
    window: StatsWindow,
    valueExpr: string,
  ): Promise<TrendPoint[]> {
    const rows = await applyTenant(
      this.tenant,
      repo
        .createQueryBuilder('t')
        .select(`to_char(t.${timeColumn} AT TIME ZONE 'UTC', :fmt)`, 'bucket')
        .addSelect(valueExpr, 'value')
        .where(`t.${timeColumn} >= :since`, { since: window.since })
        .setParameter('fmt', BUCKET_FORMAT[window.unit])
        .groupBy('bucket')
        .orderBy('bucket', 'ASC'),
      't',
    ).getRawMany<{ bucket: string; value: string }>();
    return rows.map((row) => ({ bucket: row.bucket, value: Number(row.value) }));
  }
}

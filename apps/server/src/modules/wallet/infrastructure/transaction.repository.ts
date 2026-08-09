import { Injectable } from '@nestjs/common';
import { FundDirection, WalletTxnType } from '@app/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { applyTenant, withTenant } from '../../../shared/tenant/tenant-scope.util';
import { WalletTransactionEntity } from '../domain/wallet-transaction.entity';
import { WalletTransactionRepository } from '../domain/transaction-repository.interface';

/** 钱包流水仓储的 TypeORM 实现（只读查询，按租户过滤） */
@Injectable()
export class TypeormTransactionRepository
  implements WalletTransactionRepository
{
  constructor(
    @InjectRepository(WalletTransactionEntity)
    private readonly repo: Repository<WalletTransactionEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  paginateByWallet(
    walletId: string,
    skip: number,
    take: number,
  ): Promise<[WalletTransactionEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<WalletTransactionEntity>(this.tenant, { walletId }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async sumInboundByType(
    walletId: string,
    type: WalletTxnType,
    from?: Date,
    to?: Date,
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('txn')
      .select('COALESCE(SUM(txn.amountFen), 0)', 'total')
      .where('txn.walletId = :walletId', { walletId })
      .andWhere('txn.type = :type', { type })
      .andWhere('txn.direction = :direction', {
        direction: FundDirection.In,
      });
    if (from) {
      qb.andWhere('txn.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('txn.createdAt < :to', { to });
    }
    const row = await applyTenant(this.tenant, qb, 'txn').getRawOne<{
      total: string;
    }>();
    return Number(row?.total ?? 0);
  }
}

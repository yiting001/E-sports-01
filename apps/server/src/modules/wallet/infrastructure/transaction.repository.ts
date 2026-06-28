import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
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
}

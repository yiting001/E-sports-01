import { Injectable } from '@nestjs/common';
import { WithdrawalStatus } from '@app/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { WithdrawalOrderEntity } from '../domain/withdrawal-order.entity';
import { WithdrawalOrderRepository } from '../domain/withdrawal-repository.interface';

/** 提现订单仓储的 TypeORM 实现 */
@Injectable()
export class TypeormWithdrawalRepository implements WithdrawalOrderRepository {
  constructor(
    @InjectRepository(WithdrawalOrderEntity)
    private readonly repo: Repository<WithdrawalOrderEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  countSuccessByWallet(walletId: string): Promise<number> {
    return this.repo.count({
      where: withTenant<WithdrawalOrderEntity>(this.tenant, {
        walletId,
        status: WithdrawalStatus.Success,
      }),
    });
  }
}

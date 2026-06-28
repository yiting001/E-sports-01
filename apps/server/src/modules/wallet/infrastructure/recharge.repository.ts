import { Injectable } from '@nestjs/common';
import { RechargeStatus } from '@app/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { RechargeOrderEntity } from '../domain/recharge-order.entity';
import { RechargeOrderRepository } from '../domain/recharge-repository.interface';

/** 充值订单仓储的 TypeORM 实现 */
@Injectable()
export class TypeormRechargeRepository implements RechargeOrderRepository {
  constructor(
    @InjectRepository(RechargeOrderEntity)
    private readonly repo: Repository<RechargeOrderEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  save(order: RechargeOrderEntity): Promise<RechargeOrderEntity> {
    return this.repo.save(order);
  }

  countPaidByWallet(walletId: string): Promise<number> {
    return this.repo.count({
      where: withTenant<RechargeOrderEntity>(this.tenant, {
        walletId,
        status: RechargeStatus.Paid,
      }),
    });
  }
}

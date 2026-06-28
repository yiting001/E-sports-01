import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletRepository } from '../domain/wallet-repository.interface';

/** 钱包仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormWalletRepository implements WalletRepository {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly repo: Repository<WalletEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUserId(userId: string): Promise<WalletEntity | null> {
    return this.repo.findOne({
      where: withTenant<WalletEntity>(this.tenant, {
        userId,
      }) as FindOptionsWhere<WalletEntity>,
    });
  }

  create(userId: string): WalletEntity {
    return this.repo.create({ userId });
  }

  save(wallet: WalletEntity): Promise<WalletEntity> {
    return this.repo.save(wallet);
  }
}

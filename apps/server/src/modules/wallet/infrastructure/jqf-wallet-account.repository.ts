import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { JqfWalletAccountEntity } from '../domain/jqf-wallet-account.entity';
import { JqfWalletAccountRepository } from '../domain/jqf-wallet-account-repository.interface';

/** 计全付钱包开户记录仓储的 TypeORM 实现 */
@Injectable()
export class TypeormJqfWalletAccountRepository implements JqfWalletAccountRepository {
  constructor(
    @InjectRepository(JqfWalletAccountEntity)
    private readonly repo: Repository<JqfWalletAccountEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUser(userId: string): Promise<JqfWalletAccountEntity | null> {
    return this.repo.findOne({
      where: withTenant<JqfWalletAccountEntity>(this.tenant, { userId }),
    });
  }

  save(record: JqfWalletAccountEntity): Promise<JqfWalletAccountEntity> {
    return this.repo.save(record);
  }
}

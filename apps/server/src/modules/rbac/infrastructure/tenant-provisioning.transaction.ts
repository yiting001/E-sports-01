import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { Permission } from '../domain/permission.entity';
import { Role } from '../domain/role.entity';
import {
  TenantProvisioningRepositories,
  TenantProvisioningTransaction,
} from '../domain/tenant-provisioning-transaction.interface';
import { TenantEntity } from '../domain/tenant.entity';
import { TypeormPermissionRepository } from './permission.repository';
import { TypeormRoleRepository } from './role.repository';
import { TypeormTenantRepository } from './tenant.repository';

/** TypeORM 租户开通事务适配器。 */
@Injectable()
export class TypeormTenantProvisioningTransaction implements TenantProvisioningTransaction {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenant: TenantContextService,
  ) {}

  run<T>(work: (repositories: TenantProvisioningRepositories) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        tenants: new TypeormTenantRepository(manager.getRepository(TenantEntity)),
        roles: new TypeormRoleRepository(manager.getRepository(Role), this.tenant),
        permissions: new TypeormPermissionRepository(manager.getRepository(Permission)),
      }),
    );
  }
}

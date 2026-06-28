import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';

/** 用例：删除租户（仅平台超管；内置默认租户不可删除） */
@Injectable()
export class RemoveTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    if (tenant.builtin) {
      throw new BadRequestException('内置默认租户不可删除');
    }
    await this.tenantRepo.remove(id);
  }
}

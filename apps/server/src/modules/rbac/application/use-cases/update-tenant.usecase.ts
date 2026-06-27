import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantStatus, TenantView, UpdateTenantPayload } from '@app/contracts';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';
import { toTenantView } from '../tenant.mapper';

/** 用例：更新租户名称/状态/备注（仅平台超管；内置租户不可禁用） */
@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
  ) {}

  async execute(id: string, payload: UpdateTenantPayload): Promise<TenantView> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    if (
      tenant.builtin &&
      payload.status !== undefined &&
      payload.status !== TenantStatus.Enabled
    ) {
      throw new BadRequestException('内置默认租户不可禁用');
    }
    if (payload.name !== undefined) {
      tenant.name = payload.name.trim();
    }
    if (payload.status !== undefined) {
      tenant.status = payload.status;
    }
    if (payload.remark !== undefined) {
      tenant.remark = payload.remark;
    }
    return toTenantView(await this.tenantRepo.save(tenant));
  }
}

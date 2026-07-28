import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { isTenantOverridableConfigKey } from '../../domain/tenant-config-keys';
import { ConfigService } from '../config.service';

/** 用例：删除配置项并清理缓存 */
@Injectable()
export class RemoveConfigUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(key: string): Promise<void> {
    if (!this.tenant.isSuper && !this.tenant.tenantId) {
      throw new ForbiddenException('缺少租户上下文');
    }
    if (!isTenantOverridableConfigKey(key) && !this.tenant.isSuper) {
      throw new ForbiddenException('租户管理员不能删除平台全局配置');
    }
    await this.configService.remove(key);
  }
}

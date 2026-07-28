import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { CONFIG_REPOSITORY, ConfigRepository } from '../../domain/config-repository.interface';
import { isTenantOverridableConfigKey } from '../../domain/tenant-config-keys';
import { ConfigService } from '../config.service';
import { toConfigView } from '../config.mapper';

/** 用例：查询配置列表（可按分组过滤） */
@Injectable()
export class ListConfigsUseCase {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    private readonly configService: ConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(group?: string): Promise<ConfigItemView[]> {
    if (!this.tenant.isSuper && !this.tenant.tenantId) {
      throw new ForbiddenException('缺少租户上下文');
    }
    const found = group
      ? await this.repository.findByGroup(group)
      : await this.repository.findAll();
    const items = this.tenant.isSuper
      ? found
      : found.filter((item) => isTenantOverridableConfigKey(item.key));
    return Promise.all(
      items.map(async (item) => {
        const view = toConfigView(item);
        if (item.secret) {
          return view;
        }
        return {
          ...view,
          value: (await this.configService.getRaw(item.key)) ?? item.value,
        };
      }),
    );
  }
}

import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { CONFIG_REPOSITORY, ConfigRepository } from '../../domain/config-repository.interface';
import { isTenantOverridableConfigKey } from '../../domain/tenant-config-keys';
import { UpsertConfigDto } from '../../interfaces/dto/upsert-config.dto';
import { ConfigService } from '../config.service';
import { toConfigView } from '../config.mapper';

/** 用例：新增或更新配置项，并使缓存失效 */
@Injectable()
export class UpsertConfigUseCase {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    private readonly configService: ConfigService,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(dto: UpsertConfigDto): Promise<ConfigItemView> {
    const tenantOverridable = isTenantOverridableConfigKey(dto.key);
    if (!this.tenant.isSuper && !this.tenant.tenantId) {
      throw new ForbiddenException('缺少租户上下文');
    }
    if (!tenantOverridable && !this.tenant.isSuper) {
      throw new ForbiddenException('租户管理员不能修改平台全局配置');
    }
    await this.configService.setRaw(dto.key, dto.value, {
      type: dto.type,
      group: dto.group,
      remark: dto.remark ?? '',
      secret: dto.secret ?? false,
    });
    const saved = await this.repository.findByKey(dto.key);
    if (!saved) {
      throw new InternalServerErrorException(`配置 ${dto.key} 保存后不存在`);
    }
    const view = toConfigView(saved);
    return tenantOverridable && !saved.secret ? { ...view, value: dto.value } : view;
  }
}

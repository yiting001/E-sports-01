import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_TENANT_ID, ThemeEffectsView } from '@app/contracts';
import { TenantResolver } from '../../../rbac/application/tenant-resolver.service';
import {
  THEME_SETTING_REPOSITORY,
  ThemeSettingRepository,
} from '../../domain/theme-setting-repository.interface';
import { toThemeEffectsView } from '../theme.mapper';

/**
 * 用例：C 端读取本租户启用的主题特效。
 * 该接口免登录，没有租户上下文可依赖，故按显式租户编码解析租户；
 * 编码缺省或未知时落到内置默认租户，避免跨租户下发配置。
 */
@Injectable()
export class GetPublicThemeEffectsUseCase {
  constructor(
    @Inject(THEME_SETTING_REPOSITORY)
    private readonly repo: ThemeSettingRepository,
    private readonly tenantResolver: TenantResolver,
  ) {}

  async execute(tenantCode?: string): Promise<ThemeEffectsView> {
    const tenantId =
      (await this.tenantResolver.resolveOptionalId(tenantCode)) ??
      DEFAULT_TENANT_ID;
    return toThemeEffectsView(await this.repo.findByTenantId(tenantId));
  }
}

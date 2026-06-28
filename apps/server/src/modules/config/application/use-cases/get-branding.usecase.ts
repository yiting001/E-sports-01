import { Injectable } from '@nestjs/common';
import { BrandingView, CONFIG_KEYS, DEFAULT_APP_NAME } from '@app/contracts';
import { ConfigService } from '../config.service';

/** 用例：读取平台品牌信息（软件名称 + 图标），公开可访问 */
@Injectable()
export class GetBrandingUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<BrandingView> {
    const [appName, appLogo] = await Promise.all([
      this.config.getString(CONFIG_KEYS.system.appName, DEFAULT_APP_NAME),
      this.config.getString(CONFIG_KEYS.system.appLogo, ''),
    ]);
    return { appName, appLogo };
  }
}

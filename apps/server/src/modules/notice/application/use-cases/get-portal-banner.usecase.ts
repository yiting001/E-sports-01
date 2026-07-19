import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PortalBannerView } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { parsePortalBannerConfig } from '../portal-banner.config';

/** 用例：读取首页运营横幅配置，兼容历史单图值 */
@Injectable()
export class GetPortalBannerUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<PortalBannerView> {
    const raw = await this.config.getRaw(CONFIG_KEYS.portal.homeBanner);
    return parsePortalBannerConfig(raw);
  }
}

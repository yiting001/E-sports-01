import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  ConfigGroup,
  ConfigValueType,
  PortalBannerView,
  UpdatePortalBannerPayload,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { normalizePortalBanner } from '../portal-banner.config';

/** 用例：更新首页运营横幅配置（写入配置中心，键已在默认清单登记） */
@Injectable()
export class UpdatePortalBannerUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(payload: UpdatePortalBannerPayload): Promise<PortalBannerView> {
    const banner = normalizePortalBanner(payload);
    await this.config.setRaw(CONFIG_KEYS.portal.homeBanner, JSON.stringify(banner), {
      type: ConfigValueType.Json,
      group: ConfigGroup.Portal,
      remark: 'C 端首页运营横幅（多图、活动绑定与轮播间隔，在「运营通知」页维护）',
      secret: false,
    });
    return banner;
  }
}

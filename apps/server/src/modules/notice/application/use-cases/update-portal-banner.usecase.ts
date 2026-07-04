import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PortalBannerView, UpdatePortalBannerPayload } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 用例：更新首页运营横幅图片（写入配置中心，键已在默认清单登记） */
@Injectable()
export class UpdatePortalBannerUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(payload: UpdatePortalBannerPayload): Promise<PortalBannerView> {
    await this.config.setRaw(CONFIG_KEYS.portal.homeBanner, payload.image);
    return { image: payload.image };
  }
}

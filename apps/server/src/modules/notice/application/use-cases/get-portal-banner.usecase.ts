import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PortalBannerView } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 用例：读取首页运营横幅图片（公开，未配置为空串） */
@Injectable()
export class GetPortalBannerUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<PortalBannerView> {
    const image = await this.config.getString(CONFIG_KEYS.portal.homeBanner, '');
    return { image };
  }
}

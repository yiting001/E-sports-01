import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PortalConfigView } from '@app/contracts';
import { ConfigService } from '../config.service';

/** 默认展示排行榜（后台未配置时） */
const DEFAULT_SHOW_RANK = true;

/** 用例：读取 C 端门户开关配置（排行榜显隐等），公开可访问 */
@Injectable()
export class GetPortalConfigUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<PortalConfigView> {
    const showRank = await this.config.getBoolean(
      CONFIG_KEYS.portal.showRank,
      DEFAULT_SHOW_RANK,
    );
    return { showRank };
  }
}

import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PortalConfigView } from '@app/contracts';
import { ConfigService } from '../config.service';

/** 默认展示排行榜（后台未配置时） */
const DEFAULT_SHOW_RANK = true;
const DEFAULT_VCONSOLE_ENABLED = false;
/** 语音播报默认开启，租户可在配置中心统一关闭 */
const DEFAULT_VOICE_NOTIFY_ENABLED = true;

/** 用例：读取 C 端门户开关配置（排行榜显隐等），公开可访问 */
@Injectable()
export class GetPortalConfigUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<PortalConfigView> {
    const [
      showRank,
      vConsoleEnabled,
      voiceNotifyEnabled,
      wechatOfficialLoginEnabled,
      wechatJsapiPayEnabled,
    ] = await Promise.all([
      this.config.getBoolean(CONFIG_KEYS.portal.showRank, DEFAULT_SHOW_RANK),
      this.config.getBoolean(
        CONFIG_KEYS.portal.vConsoleEnabled,
        DEFAULT_VCONSOLE_ENABLED,
      ),
      this.config.getBoolean(
        CONFIG_KEYS.notify.voiceEnabled,
        DEFAULT_VOICE_NOTIFY_ENABLED,
      ),
      this.config.getBoolean(CONFIG_KEYS.auth.wechatOfficialLoginEnabled, false),
      this.config.getBoolean(CONFIG_KEYS.wallet.wechatJsapiEnabled, false),
    ]);
    return {
      showRank,
      vConsoleEnabled,
      voiceNotifyEnabled,
      wechatOfficialLoginEnabled,
      wechatJsapiPayEnabled,
    };
  }
}

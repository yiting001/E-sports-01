import { BadRequestException, Injectable } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { WechatIdentityService } from '../../rbac/application/wechat-identity.service';

/**
 * 公众号 JSAPI 支付前置校验（充值与订单支付共用）：
 * 后台开关开启且当前用户已绑定公众号 openid，否则以清晰业务错误拒绝。
 * openid 只在服务端流转，不经接口层回传。
 */
@Injectable()
export class WechatJsapiPayerService {
  constructor(
    private readonly config: ConfigService,
    private readonly wechatIdentity: WechatIdentityService,
  ) {}

  async resolveOpenid(userId: string): Promise<string> {
    const enabled = await this.config.getBoolean(CONFIG_KEYS.wallet.wechatJsapiEnabled, false);
    if (!enabled) {
      throw new BadRequestException('微信公众号支付未开启');
    }
    const openid = await this.wechatIdentity.findOpenid(userId);
    if (!openid) {
      throw new BadRequestException('请先在微信内完成微信登录或绑定后再支付');
    }
    return openid;
  }
}

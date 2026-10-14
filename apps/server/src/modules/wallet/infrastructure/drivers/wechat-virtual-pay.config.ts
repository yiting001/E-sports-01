import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 微信小程序虚拟支付运行所需凭证（全部取自配置中心） */
export interface WechatVirtualPayConfig {
  /** 小程序 AppId */
  appId: string;
  /** 小程序 AppSecret（换取 session_key） */
  appSecret: string;
  /** 虚拟支付 offerId（小程序后台-支付基础配置） */
  offerId: string;
  /** 虚拟支付 AppKey（支付签名 paySig 用） */
  appKey: string;
  /** 每元代币数（代币充值比例，用于回调金额换算） */
  coinPerYuan: number;
  /** 环境：0=现网 1=沙箱（iOS 不支持沙箱） */
  env: number;
  /** 消息推送 Token（URL 校验签名用，与小程序后台一致） */
  callbackToken: string;
  /** 消息推送 EncodingAESKey（安全模式解密用；明文模式为空串） */
  callbackAesKey: string;
}

/**
 * 微信小程序虚拟支付配置工厂。
 * 集中读取并校验凭证；缺失即如实抛「未配置」，避免静默失败（与 WechatPayConfigFactory 同风格）。
 */
@Injectable()
export class WechatVirtualPayConfigFactory {
  constructor(private readonly config: ConfigService) {}

  async load(): Promise<WechatVirtualPayConfig> {
    const keys = CONFIG_KEYS.wallet;
    const coinPerYuan = await this.config.getNumber(
      keys.wechatVirtualCoinPerYuan,
      1,
    );
    const env = await this.config.getNumber(keys.wechatVirtualEnv, 0);
    const cfg: WechatVirtualPayConfig = {
      appId: await this.config.getString(keys.wechatVirtualAppId, ''),
      appSecret: await this.config.getString(keys.wechatVirtualAppSecret, ''),
      offerId: await this.config.getString(keys.wechatVirtualOfferId, ''),
      appKey: await this.config.getString(keys.wechatVirtualAppKey, ''),
      coinPerYuan: coinPerYuan > 0 ? coinPerYuan : 1,
      env: env === 1 ? 1 : 0,
      callbackToken: await this.config.getString(
        keys.wechatVirtualCallbackToken,
        '',
      ),
      callbackAesKey: await this.config.getString(
        keys.wechatVirtualCallbackAesKey,
        '',
      ),
    };
    if (!cfg.appId || !cfg.appSecret || !cfg.offerId || !cfg.appKey) {
      throw new ServiceUnavailableException(
        '微信小程序虚拟支付未配置，请在配置中心填写 wallet.wechatVirtual.* 后重试',
      );
    }
    return cfg;
  }
}

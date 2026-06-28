import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 微信支付 v3 运行所需凭证（全部取自配置中心） */
export interface WechatPayConfig {
  appId: string;
  mchId: string;
  /** 商户证书序列号 */
  serial: string;
  /** 商户私钥（PEM） */
  privateKey: string;
  /** APIv3 密钥（用于回调报文 AES-GCM 解密） */
  apiV3Key: string;
  /** 平台证书公钥（PEM，用于回调验签） */
  platformPublicKey: string;
  /** 平台证书序列号（用于回调验签的证书匹配） */
  platformSerial: string;
}

/**
 * 微信支付配置工厂。
 * 集中读取并校验凭证；缺失即如实抛「未配置」，避免静默失败。
 */
@Injectable()
export class WechatPayConfigFactory {
  constructor(private readonly config: ConfigService) {}

  async load(): Promise<WechatPayConfig> {
    const keys = CONFIG_KEYS.wallet;
    const cfg: WechatPayConfig = {
      appId: await this.config.getString(keys.wechatAppId, ''),
      mchId: await this.config.getString(keys.wechatMchId, ''),
      serial: await this.config.getString(keys.wechatSerialNo, ''),
      privateKey: await this.config.getString(keys.wechatPrivateKey, ''),
      apiV3Key: await this.config.getString(keys.wechatApiV3Key, ''),
      platformPublicKey: await this.config.getString(
        keys.wechatPlatformPublicKey,
        '',
      ),
      platformSerial: await this.config.getString(
        keys.wechatPlatformSerialNo,
        '',
      ),
    };
    if (!cfg.appId || !cfg.mchId || !cfg.serial || !cfg.privateKey) {
      throw new ServiceUnavailableException(
        '微信支付未配置，请在配置中心填写 wallet.wechat.* 后重试',
      );
    }
    return cfg;
  }
}

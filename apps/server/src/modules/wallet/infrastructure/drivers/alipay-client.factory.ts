import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { AlipaySdk } from 'alipay-sdk';
import { ConfigService } from '../../../config/application/config.service';
import { normalizePem } from './pem.util';

/**
 * 支付宝 SDK 工厂。
 * 凭证全部取自配置中心（无硬编码），按需构建实例供「充值下单/验签」与「转账提现」复用。
 * 支持两种签名模式并自动识别：
 * - 证书模式：应用公钥证书 + 支付宝公钥证书 + 支付宝根证书三证齐全时启用（转账等资金接口必须证书模式）；
 * - 公钥模式：仅配置支付宝公钥时的兜底模式。
 * 凭证缺失时如实抛出「未配置」，避免静默失败。
 */
@Injectable()
export class AlipayClientFactory {
  constructor(private readonly config: ConfigService) {}

  async create(): Promise<AlipaySdk> {
    const appId = await this.config.getString(CONFIG_KEYS.wallet.alipayAppId, '');
    const privateKey = await this.config.getString(
      CONFIG_KEYS.wallet.alipayPrivateKey,
      '',
    );
    const gateway = await this.config.getString(
      CONFIG_KEYS.wallet.alipayGateway,
      '',
    );
    if (!appId || !privateKey) {
      throw new ServiceUnavailableException(
        '支付宝支付未配置，请在配置中心填写 wallet.alipay.* 后重试',
      );
    }
    const base = {
      appId,
      privateKey,
      ...(gateway ? { gateway } : {}),
    };

    const appCert = await this.config.getString(
      CONFIG_KEYS.wallet.alipayAppCert,
      '',
    );
    const alipayPublicCert = await this.config.getString(
      CONFIG_KEYS.wallet.alipayPublicCert,
      '',
    );
    const rootCert = await this.config.getString(
      CONFIG_KEYS.wallet.alipayRootCert,
      '',
    );
    if (appCert && alipayPublicCert && rootCert) {
      return new AlipaySdk({
        ...base,
        appCertContent: normalizePem(appCert),
        alipayPublicCertContent: normalizePem(alipayPublicCert),
        alipayRootCertContent: normalizePem(rootCert),
      });
    }

    const alipayPublicKey = await this.config.getString(
      CONFIG_KEYS.wallet.alipayPublicKey,
      '',
    );
    if (!alipayPublicKey) {
      throw new ServiceUnavailableException(
        '支付宝密钥不完整：请配置三张证书（证书模式）或支付宝公钥（公钥模式）',
      );
    }
    return new AlipaySdk({ ...base, alipayPublicKey });
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { AlipaySdk } from 'alipay-sdk';
import { ConfigService } from '../../../config/application/config.service';

/**
 * 支付宝 SDK 工厂。
 * 凭证全部取自配置中心（无硬编码），按需构建实例供「充值下单/验签」与「转账提现」复用；
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
    const alipayPublicKey = await this.config.getString(
      CONFIG_KEYS.wallet.alipayPublicKey,
      '',
    );
    const gateway = await this.config.getString(
      CONFIG_KEYS.wallet.alipayGateway,
      '',
    );
    if (!appId || !privateKey || !alipayPublicKey) {
      throw new ServiceUnavailableException(
        '支付宝支付未配置，请在配置中心填写 wallet.alipay.* 后重试',
      );
    }
    return new AlipaySdk({
      appId,
      privateKey,
      alipayPublicKey,
      ...(gateway ? { gateway } : {}),
    });
  }
}

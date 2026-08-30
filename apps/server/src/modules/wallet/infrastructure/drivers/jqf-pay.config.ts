import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';

/** 计全付网关凭证（配置中心 wallet.jqf.* 提供，代码中不落任何真实值） */
export interface JqfPayConfig {
  /** 网关地址（如 https://pay.example.com，末尾不带 /） */
  apiBase: string;
  /** 商户号 */
  mchNo: string;
  /** 应用 appId */
  appId: string;
  /** 接口私钥（MD5 签名密钥） */
  apiKey: string;
}

/** 从配置中心装配计全付凭证；缺失即视为未配置，拒绝发起资金请求。 */
@Injectable()
export class JqfPayConfigFactory {
  constructor(private readonly config: ConfigService) {}

  async load(): Promise<JqfPayConfig> {
    const keys = CONFIG_KEYS.wallet;
    const cfg: JqfPayConfig = {
      apiBase: (await this.config.getString(keys.jqfApiBase, '')).replace(/\/+$/, ''),
      mchNo: await this.config.getString(keys.jqfMchNo, ''),
      appId: await this.config.getString(keys.jqfAppId, ''),
      apiKey: await this.config.getString(keys.jqfApiKey, ''),
    };
    if (!cfg.apiBase || !cfg.mchNo || !cfg.appId || !cfg.apiKey) {
      throw new ServiceUnavailableException(
        '计全付未配置，请在管理端「支付配置」页填写网关地址、商户号、appId 与 apiKey 后重试',
      );
    }
    if (!cfg.apiBase.startsWith('https://')) {
      throw new ServiceUnavailableException('计全付网关地址必须使用 HTTPS');
    }
    return cfg;
  }
}

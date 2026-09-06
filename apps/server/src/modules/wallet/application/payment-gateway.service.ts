import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  JqfTransferIfCode,
  PaymentGateway,
  PaymentProvider,
  PayoutProvider,
  WITHDRAW_METHODS_BY_GATEWAY,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { readJqfTransferIfCode } from '../infrastructure/drivers/jqf-pay.config';

/**
 * 资金网关路由：按配置中心开关把用户选择的「支付宝 / 微信」映射为实际执行渠道。
 * - 支付：微信（扫码/公众号）、支付宝（扫码）分别受 wallet.payment.wechatGateway / alipayGateway 控制，
 *   开启计全付时替换为对应的计全付驱动；
 * - 提现：受 wallet.payout.gateway 控制，默认计全付：官方直连仅支付宝转账，
 *   计全付统一转账到银行卡（BANK_CARD）；普通用户、打手、客服的提现均经钱包提现单走同一路径。
 * 注意：下单/发起时解析出的实际渠道会持久化到单据上，回调与查单按单据渠道路由，
 * 切换网关只影响之后新建的单据；退款按「当前」网关配置路由，切换前请先处理完在途订单。
 */
@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  /** 支付下单渠道：官方渠道按网关开关映射，其余渠道原样返回。 */
  async resolvePaymentProvider(provider: PaymentProvider): Promise<PaymentProvider> {
    if (provider === PaymentProvider.Wechat || provider === PaymentProvider.WechatJsapi) {
      if (await this.isJqf(CONFIG_KEYS.wallet.paymentWechatGateway)) {
        return provider === PaymentProvider.Wechat
          ? PaymentProvider.JqfWechat
          : PaymentProvider.JqfWechatJsapi;
      }
    }
    if (
      provider === PaymentProvider.Alipay &&
      (await this.isJqf(CONFIG_KEYS.wallet.paymentAlipayGateway))
    ) {
      return PaymentProvider.JqfAlipay;
    }
    return provider;
  }

  /** 退款渠道：官方退款驱动与计全付退款驱动按对应支付方式的网关开关切换。 */
  async resolveRefundProvider(provider: PaymentProvider): Promise<PaymentProvider> {
    if (
      provider === PaymentProvider.Wechat &&
      (await this.isJqf(CONFIG_KEYS.wallet.paymentWechatGateway))
    ) {
      return PaymentProvider.JqfWechat;
    }
    if (
      provider === PaymentProvider.Alipay &&
      (await this.isJqf(CONFIG_KEYS.wallet.paymentAlipayGateway))
    ) {
      return PaymentProvider.JqfAlipay;
    }
    return provider;
  }

  /** 当前提现网关（未配置默认计全付） */
  async payoutGateway(): Promise<PaymentGateway> {
    return (await this.isJqf(CONFIG_KEYS.wallet.payoutGateway, PaymentGateway.Jqf))
      ? PaymentGateway.Jqf
      : PaymentGateway.Official;
  }

  /** 当前网关下用户可选的提现方式：官方→支付宝；计全付→银行卡 */
  async withdrawMethods(): Promise<PayoutProvider[]> {
    return [...WITHDRAW_METHODS_BY_GATEWAY[await this.payoutGateway()]];
  }

  /** 银行卡提现是否需要预留手机号：计全付接口为易宝时对私银行卡要求身份证号 + 手机号 */
  async withdrawPhoneRequired(): Promise<boolean> {
    if ((await this.payoutGateway()) !== PaymentGateway.Jqf) {
      return false;
    }
    const ifCode = readJqfTransferIfCode(
      await this.config.getString(CONFIG_KEYS.wallet.jqfTransferIfCode, JqfTransferIfCode.AliAqfPay),
    );
    return ifCode === JqfTransferIfCode.YeePay;
  }

  /**
   * 提现渠道：用户选择的「银行卡」固定映射为计全付银行卡转账（仅计全付网关提供该选项），
   * 支付宝保持官方直连；已是实际执行渠道（jqf_*）的原样返回。
   */
  resolvePayoutProvider(provider: PayoutProvider): PayoutProvider {
    return provider === PayoutProvider.BankCard ? PayoutProvider.JqfBankCard : provider;
  }

  private async isJqf(
    key: string,
    fallback: PaymentGateway = PaymentGateway.Official,
  ): Promise<boolean> {
    const gateway = await this.config.getString(key, fallback);
    return gateway === PaymentGateway.Jqf;
  }
}

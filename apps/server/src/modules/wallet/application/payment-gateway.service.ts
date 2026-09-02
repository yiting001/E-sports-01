import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PaymentGateway, PaymentProvider, PayoutProvider } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';

/**
 * 资金网关路由：按配置中心开关把用户选择的「支付宝 / 微信」映射为实际执行渠道。
 * - 支付：微信（扫码/公众号）、支付宝（扫码）分别受 wallet.payment.wechatGateway / alipayGateway 控制，
 *   开启计全付时替换为对应的计全付驱动；
 * - 提现：受 wallet.payout.gateway 控制，默认计全付，支付宝/微信零钱提现均走计全付转账驱动；
 *   普通用户、打手、客服的提现均经钱包提现单走同一路径。
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

  /** 提现渠道：用户选择的支付宝/微信零钱按提现网关开关映射，默认计全付转账，仅显式配为 official 时走官方直连。 */
  async resolvePayoutProvider(provider: PayoutProvider): Promise<PayoutProvider> {
    if (provider === PayoutProvider.Alipay || provider === PayoutProvider.Wechat) {
      if (await this.isJqf(CONFIG_KEYS.wallet.payoutGateway, PaymentGateway.Jqf)) {
        return provider === PayoutProvider.Alipay
          ? PayoutProvider.JqfAlipay
          : PayoutProvider.JqfWechat;
      }
    }
    return provider;
  }

  private async isJqf(
    key: string,
    fallback: PaymentGateway = PaymentGateway.Official,
  ): Promise<boolean> {
    const gateway = await this.config.getString(key, fallback);
    return gateway === PaymentGateway.Jqf;
  }
}

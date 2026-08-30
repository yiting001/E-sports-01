import { Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PaymentGateway, PaymentProvider } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';

/**
 * 支付网关路由：按配置中心开关把「官方渠道」映射为实际执行渠道。
 * 微信（扫码/公众号）开启计全付时替换为计全付驱动；
 * 支付宝当前计全付不支持，配置为 jqf 也回落官方渠道，保证支付宝始终可用。
 * 注意：查单与退款按「当前」网关配置路由，切换网关前请先处理完在途订单。
 */
@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  /** 支付下单/查单渠道：官方渠道按网关开关映射，其余渠道原样返回。 */
  async resolvePaymentProvider(provider: PaymentProvider): Promise<PaymentProvider> {
    if (provider === PaymentProvider.Wechat || provider === PaymentProvider.WechatJsapi) {
      if (await this.isWechatJqf()) {
        return provider === PaymentProvider.Wechat
          ? PaymentProvider.JqfWechat
          : PaymentProvider.JqfWechatJsapi;
      }
    }
    return provider;
  }

  /** 退款渠道：微信官方退款驱动与计全付退款驱动按网关开关切换。 */
  async resolveRefundProvider(provider: PaymentProvider): Promise<PaymentProvider> {
    if (provider === PaymentProvider.Wechat && (await this.isWechatJqf())) {
      return PaymentProvider.JqfWechat;
    }
    return provider;
  }

  private async isWechatJqf(): Promise<boolean> {
    const gateway = await this.config.getString(
      CONFIG_KEYS.wallet.paymentWechatGateway,
      PaymentGateway.Official,
    );
    return gateway === PaymentGateway.Jqf;
  }
}

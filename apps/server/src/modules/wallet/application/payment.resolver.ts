import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PaymentProvider } from '@app/contracts';
import {
  PAYMENT_PORTS,
  PaymentPort,
} from '../domain/payment-port.interface';

/**
 * 充值渠道解析器（策略模式选择器）。
 * 按调用方指定的渠道从已注册策略集合中挑选实现；未注册即抛错。
 * 新增渠道只需注册进 PAYMENT_PORTS，无需改动此处与上层用例。
 */
@Injectable()
export class PaymentResolver {
  constructor(
    @Inject(PAYMENT_PORTS) private readonly ports: PaymentPort[],
  ) {}

  resolve(provider: PaymentProvider): PaymentPort {
    const port = this.ports.find((p) => p.provider === provider);
    if (!port) {
      throw new InternalServerErrorException(`未注册的充值渠道：${provider}`);
    }
    return port;
  }
}

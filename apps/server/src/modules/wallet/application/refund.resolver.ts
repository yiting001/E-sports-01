import { PaymentProvider } from '@app/contracts';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { REFUND_PORTS, RefundPort } from '../domain/refund-port.interface';

/** 按订单原支付渠道选择退款策略。 */
@Injectable()
export class RefundResolver {
  constructor(@Inject(REFUND_PORTS) private readonly ports: RefundPort[]) {}

  resolve(provider: PaymentProvider): RefundPort {
    const port = this.ports.find((candidate) => candidate.provider === provider);
    if (!port) {
      throw new InternalServerErrorException(`未注册的退款渠道：${provider}`);
    }
    return port;
  }
}

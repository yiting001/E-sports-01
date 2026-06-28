import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PayoutProvider } from '@app/contracts';
import { PAYOUT_PORTS, PayoutPort } from '../domain/payout-port.interface';

/**
 * 提现渠道解析器（策略模式选择器）。
 * 按调用方指定的渠道从已注册策略集合中挑选实现；未注册即抛错。
 */
@Injectable()
export class PayoutResolver {
  constructor(@Inject(PAYOUT_PORTS) private readonly ports: PayoutPort[]) {}

  resolve(provider: PayoutProvider): PayoutPort {
    const port = this.ports.find((p) => p.provider === provider);
    if (!port) {
      throw new InternalServerErrorException(`未注册的提现渠道：${provider}`);
    }
    return port;
  }
}

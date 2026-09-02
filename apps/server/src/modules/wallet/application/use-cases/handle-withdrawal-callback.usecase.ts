import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { PayoutProvider } from '@app/contracts';
import { PayoutCallbackRequest } from '../../domain/payout-port.interface';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { PayoutResolver } from '../payout.resolver';
import { WithdrawalSettlementService } from '../withdrawal-settlement.service';

/**
 * 用例：处理转账渠道的提现异步通知。
 * 按 URL 渠道验签解析 → 以商户提现单号定位本地提现单（公开回调无租户上下文，按单号全局查找）
 * → 校验通知渠道与提现单执行渠道一致、通知金额与到账金额一致 → 交由收敛服务幂等推进状态
 * → 返回渠道要求的应答报文。通知中的「无此单」不会出现（渠道只通知自己受理过的单），
 * 一律按处理中刷新快照，不回滚。
 */
@Injectable()
export class HandleWithdrawalCallbackUseCase {
  private readonly logger = new Logger(HandleWithdrawalCallbackUseCase.name);

  constructor(
    private readonly payoutResolver: PayoutResolver,
    private readonly settlement: WithdrawalSettlementService,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(
    provider: PayoutProvider,
    req: PayoutCallbackRequest,
  ): Promise<string> {
    const port = this.payoutResolver.resolve(provider);
    const result = await port.parseCallback(req);
    const order = await this.withdrawalRepo.findByOutBizNo(result.outBizNo);
    if (!order) {
      throw new BadRequestException('提现单不存在');
    }
    if (order.provider !== provider) {
      this.logger.warn(
        `提现通知渠道不匹配 outBizNo=${order.outBizNo} expected=${order.provider} got=${provider}`,
      );
      throw new BadRequestException('提现单渠道不匹配');
    }
    const arriveFen = order.amountFen - order.feeFen;
    if (result.amountFen !== arriveFen) {
      this.logger.warn(
        `提现通知金额不符 outBizNo=${order.outBizNo} expected=${arriveFen} got=${result.amountFen}`,
      );
      throw new BadRequestException('提现单金额不符');
    }
    await this.settlement.apply(order.id, result);
    return port.callbackAck();
  }
}

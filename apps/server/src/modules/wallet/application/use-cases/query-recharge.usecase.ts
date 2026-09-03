import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RechargeStatus, RechargeStatusView } from '@app/contracts';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import {
  RECHARGE_ORDER_REPOSITORY,
  RechargeOrderRepository,
} from '../../domain/recharge-repository.interface';
import { PaymentResolver } from '../payment.resolver';
import { WalletService } from '../wallet.service';

/**
 * 用例：主动查询充值支付结果（异步回调未达时的兜底确认）。
 * 待支付充值单调用渠道官方查单接口（alipay.trade.query / 微信商户订单号查单），
 * 查到已支付即走与回调相同的幂等入账口，返回最新状态供前端结束轮询。
 */
@Injectable()
export class QueryRechargeUseCase {
  constructor(
    @Inject(RECHARGE_ORDER_REPOSITORY)
    private readonly rechargeRepo: RechargeOrderRepository,
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
    private readonly paymentResolver: PaymentResolver,
    private readonly walletService: WalletService,
  ) {}

  async execute(
    userId: string,
    outTradeNo: string,
  ): Promise<RechargeStatusView> {
    const order = await this.rechargeRepo.findByOutTradeNo(outTradeNo);
    const wallet = await this.walletService.ensureWallet(userId);
    if (!order || order.walletId !== wallet.id) {
      throw new NotFoundException('充值订单不存在');
    }
    if (order.status !== RechargeStatus.Pending) {
      return { outTradeNo, status: order.status };
    }
    const port = this.paymentResolver.resolve(order.provider);
    const result = await port.queryTrade(outTradeNo);
    if (result.paid) {
      const credited = await this.ledger.creditRecharge({
        outTradeNo,
        providerTradeNo: result.providerTradeNo,
        paidAmountFen: result.paidAmountFen,
        channelFeeFen: result.channelFeeFen ?? null,
      });
      if (credited) {
        return { outTradeNo, status: RechargeStatus.Paid };
      }
    }
    return { outTradeNo, status: order.status };
  }
}

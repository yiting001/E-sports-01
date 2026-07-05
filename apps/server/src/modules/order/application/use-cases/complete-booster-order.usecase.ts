import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FundDirection,
  OrderStatus,
  OrderView,
  WalletTxnType,
  calcCommissionFen,
  fenToYuan,
} from '@app/contracts';
import { BoosterProgressService } from '../../../booster/application/booster-progress.service';
import { WalletService } from '../../../wallet/application/wallet.service';
import {
  WALLET_LEDGER,
  WalletLedger,
} from '../../../wallet/domain/ledger.interface';
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from '../../domain/order-repository.interface';
import { BoosterAccess } from '../booster-access.service';
import { toOrderView } from '../order.mapper';

/**
 * 用例：打手完成服务（服务中 → 已完成，仅限本人接下的订单）。
 * 完成时结算提成：按打手当前等级费率计提成经 WalletLedger 入账（commission 流水），
 * 订单落提成金额/费率快照，并累计完成单数推动等级晋升。
 */
@Injectable()
export class CompleteBoosterOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
    private readonly boosterAccess: BoosterAccess,
    private readonly boosterProgress: BoosterProgressService,
    @Inject(WALLET_LEDGER)
    private readonly ledger: WalletLedger,
    private readonly walletService: WalletService,
  ) {}

  async execute(userId: string, id: string): Promise<OrderView> {
    await this.boosterAccess.assert(userId);
    const order = await this.orders.findById(id);
    if (!order || order.boosterId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.Serving) {
      throw new BadRequestException('仅「服务中」订单可完成');
    }
    const tier = await this.boosterProgress.recordCompletedOrder(userId);
    const commissionFen = calcCommissionFen(
      order.amountFen,
      tier.commissionRateBp,
    );
    if (commissionFen > 0) {
      const wallet = await this.walletService.ensureWallet(userId);
      await this.ledger.adjustBalance({
        walletId: wallet.id,
        direction: FundDirection.In,
        amountFen: commissionFen,
        type: WalletTxnType.Commission,
        remark: `订单 ${order.orderNo} 提成 ${fenToYuan(commissionFen)} 元（${tier.name}）`,
      });
    }
    order.status = OrderStatus.Completed;
    order.commissionFen = commissionFen;
    order.commissionRateBp = tier.commissionRateBp;
    return toOrderView(await this.orders.save(order));
  }
}

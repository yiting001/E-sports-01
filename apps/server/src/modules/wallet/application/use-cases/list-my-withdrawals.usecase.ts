import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  WithdrawalView,
  fenToYuan,
} from '@app/contracts';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { WithdrawalOrderEntity } from '../../domain/withdrawal-order.entity';
import { WalletService } from '../wallet.service';

/** 提现订单实体 → C 端我的提现记录视图 */
function toWithdrawalView(order: WithdrawalOrderEntity): WithdrawalView {
  const arriveFen = order.amountFen - order.feeFen;
  return {
    id: order.id,
    amountFen: order.amountFen,
    amountYuan: fenToYuan(order.amountFen),
    feeFen: order.feeFen,
    feeYuan: fenToYuan(order.feeFen),
    arriveFen,
    arriveYuan: fenToYuan(arriveFen),
    provider: order.provider,
    status: order.status,
    account: order.account,
    failReason: order.failReason,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * 用例：分页查询当前用户的提现记录（含审核状态/到账金额/失败原因）。
 * 先定位/初始化钱包，再按钱包过滤分页，保证只见本人提现单。
 */
@Injectable()
export class ListMyWithdrawalsUseCase {
  constructor(
    private readonly walletService: WalletService,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<WithdrawalView>> {
    const wallet = await this.walletService.ensureWallet(userId);
    const [orders, total] = await this.withdrawalRepo.paginateByWallet(
      wallet.id,
      skip,
      pageSize,
    );
    return { list: orders.map(toWithdrawalView), total, page, pageSize };
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  CONFIG_KEYS,
  CreateWithdrawalBody,
  WALLET_DEFAULTS,
  WithdrawalResultView,
  WithdrawalStatus,
  fenToYuan,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import { PayoutResolver } from '../payout.resolver';
import { WalletService } from '../wallet.service';
import { buildOrderNo } from '../order-no.util';

/** 提现转账备注 */
const WITHDRAW_REMARK = '钱包提现';

/**
 * 用例：发起提现（方案A：申请即冻结扣减）。
 * 校验金额与渠道可用 → 冻结扣减并落处理中订单 → 调渠道转账；
 * 成功置 success，失败回滚余额并置 failed。余额一致性由账务单元事务保证。
 */
@Injectable()
export class CreateWithdrawalUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly payoutResolver: PayoutResolver,
    private readonly config: ConfigService,
    @Inject(WALLET_LEDGER) private readonly ledger: WalletLedger,
  ) {}

  async execute(
    userId: string,
    body: CreateWithdrawalBody,
  ): Promise<WithdrawalResultView> {
    const minWithdraw = await this.config.getNumber(
      CONFIG_KEYS.wallet.minWithdrawFen,
      WALLET_DEFAULTS.minWithdrawFen,
    );
    if (!Number.isInteger(body.amountFen) || body.amountFen < minWithdraw) {
      throw new BadRequestException(
        `提现金额不得低于 ${fenToYuan(minWithdraw)} 元`,
      );
    }

    const port = this.payoutResolver.resolve(body.provider);
    if (!port.available) {
      throw new NotImplementedException('该提现渠道暂未开通，请改用支付宝提现');
    }

    const wallet = await this.walletService.ensureWallet(userId);
    const outBizNo = buildOrderNo('W');
    const order = await this.ledger.reserveWithdrawal({
      walletId: wallet.id,
      amountFen: body.amountFen,
      provider: body.provider,
      account: body.account,
      accountName: body.accountName,
      outBizNo,
    });

    try {
      const { providerOrderId } = await port.transfer({
        outBizNo,
        amountFen: body.amountFen,
        account: body.account,
        accountName: body.accountName,
        remark: WITHDRAW_REMARK,
      });
      await this.ledger.markWithdrawalSuccess(order.id, providerOrderId);
      return { orderId: order.id, status: WithdrawalStatus.Success, failReason: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : '转账失败';
      await this.ledger.refundWithdrawal(order.id, reason);
      return { orderId: order.id, status: WithdrawalStatus.Failed, failReason: reason };
    }
  }
}

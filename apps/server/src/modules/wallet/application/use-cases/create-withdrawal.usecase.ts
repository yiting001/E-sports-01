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
  WithdrawTaxTier,
  calcWithdrawFeeFen,
  fenToYuan,
  pickWithdrawFeeRateBp,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import { PayoutResolver } from '../payout.resolver';
import { WalletService } from '../wallet.service';
import { buildOrderNo } from '../order-no.util';

/**
 * 用例：发起提现申请（审核制）。
 * 校验金额与渠道可用 → 按配置费率计算手续费 → 冻结扣减并落待审核订单；
 * 后续由财务在提现管理中审核，通过后才发起渠道转账。
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

    const flatRateBp = await this.config.getNumber(
      CONFIG_KEYS.wallet.withdrawFeeRateBp,
      WALLET_DEFAULTS.withdrawFeeRateBp,
    );
    const tiers = sanitizeWithdrawTaxTiers(
      await this.config.getJson<WithdrawTaxTier[]>(
        CONFIG_KEYS.wallet.withdrawTaxTiers,
        [],
      ),
    );
    const feeRateBp = pickWithdrawFeeRateBp(body.amountFen, tiers, flatRateBp);
    const feeFen = calcWithdrawFeeFen(body.amountFen, feeRateBp);
    if (feeFen >= body.amountFen) {
      throw new BadRequestException('提现金额过小，扣除手续费后无可到账金额');
    }

    const wallet = await this.walletService.ensureWallet(userId);
    const order = await this.ledger.reserveWithdrawal({
      walletId: wallet.id,
      amountFen: body.amountFen,
      feeFen,
      provider: body.provider,
      account: body.account,
      accountName: body.accountName,
      idCardNo: body.idCardNo,
      outBizNo: buildOrderNo('W'),
    });
    return {
      orderId: order.id,
      status: WithdrawalStatus.Pending,
      feeFen,
      arriveFen: body.amountFen - feeFen,
      failReason: null,
    };
  }
}

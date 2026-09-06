import {
  BadRequestException,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  BANK_CARD_NO_PATTERN,
  CONFIG_KEYS,
  CreateWithdrawalBody,
  PAYOUT_PHONE_PATTERN,
  PAYOUT_PROVIDER_TEXT,
  PayoutProvider,
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
import { PaymentGatewayService } from '../payment-gateway.service';
import { PayoutResolver } from '../payout.resolver';
import { WalletService } from '../wallet.service';
import { buildOrderNo } from '../order-no.util';

/** 收款要素（按提现方式校验后的规范值） */
interface PayeeInfo {
  account: string;
  bankName: string | null;
  phone: string | null;
}

/**
 * 用例：发起提现申请（审核制）。
 * 校验金额与提现方式（仅接受当前提现网关提供的方式：官方→支付宝，计全付→银行卡）
 * → 解析实际执行渠道并校验可用 → 校验收款要素（支付宝登录号；银行卡号 + 开户行，渠道要求时另需预留手机号）
 * → 按配置费率计算手续费 → 冻结扣减并落待审核订单（持久化实际执行渠道，之后切换网关不影响在途单）；
 * 后续由财务在提现管理中审核，通过后才发起渠道转账。
 */
@Injectable()
export class CreateWithdrawalUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly payoutResolver: PayoutResolver,
    private readonly paymentGateway: PaymentGatewayService,
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
    const methods = await this.paymentGateway.withdrawMethods();
    if (!methods.includes(body.provider)) {
      throw new BadRequestException(
        `当前提现方式仅支持${methods.map((m) => PAYOUT_PROVIDER_TEXT[m]).join('、')}`,
      );
    }

    const provider = this.paymentGateway.resolvePayoutProvider(body.provider);
    const port = this.payoutResolver.resolve(provider);
    if (!port.available) {
      throw new NotImplementedException('该提现渠道暂未开通，请稍后再试');
    }
    const payee = await this.resolvePayee(body);

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
      provider,
      account: payee.account,
      accountName: body.accountName,
      idCardNo: body.idCardNo,
      bankName: payee.bankName,
      phone: payee.phone,
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

  /** 收款要素：支付宝取登录号；银行卡取卡号 + 开户行，计全付接口要求时另需预留手机号。 */
  private async resolvePayee(body: CreateWithdrawalBody): Promise<PayeeInfo> {
    const account = body.account?.trim() ?? '';
    if (body.provider !== PayoutProvider.BankCard) {
      if (!account) {
        throw new BadRequestException('请填写收款支付宝账号');
      }
      return { account, bankName: null, phone: null };
    }
    const cardNo = account.replace(/\s+/g, '');
    if (!BANK_CARD_NO_PATTERN.test(cardNo)) {
      throw new BadRequestException('请填写正确的银行卡号（10～30 位数字）');
    }
    const bankName = body.bankName?.trim() ?? '';
    if (!bankName) {
      throw new BadRequestException('请填写开户行名称');
    }
    const phone = body.phone?.trim() ?? '';
    if (phone && !PAYOUT_PHONE_PATTERN.test(phone)) {
      throw new BadRequestException('请填写正确的银行预留手机号');
    }
    if (!phone && (await this.paymentGateway.withdrawPhoneRequired())) {
      throw new BadRequestException('当前银行卡提现渠道需填写银行预留手机号');
    }
    return { account: cardNo, bankName, phone: phone || null };
  }
}

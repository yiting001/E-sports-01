import {
  BadRequestException,
  Inject,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  CONFIG_KEYS,
  CreateWithdrawalBody,
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
import { WechatIdentityService } from '../../../rbac/application/wechat-identity.service';
import { WALLET_LEDGER, WalletLedger } from '../../domain/ledger.interface';
import { PaymentGatewayService } from '../payment-gateway.service';
import { PayoutResolver } from '../payout.resolver';
import { WalletService } from '../wallet.service';
import { buildOrderNo } from '../order-no.util';

/** 用户可选择的提现方式（支付宝 / 微信零钱）；实际执行渠道由提现网关配置决定 */
const USER_PAYOUT_CHOICES = new Set<PayoutProvider>([
  PayoutProvider.Alipay,
  PayoutProvider.Wechat,
]);

/**
 * 用例：发起提现申请（审核制）。
 * 校验金额与提现方式 → 按网关配置解析实际执行渠道并校验可用 → 解析收款标识
 * （支付宝为用户填写的登录号；微信零钱取服务端绑定的公众号 openid，不信任客户端提交）
 * → 按配置费率计算手续费 → 冻结扣减并落待审核订单（持久化实际执行渠道，之后切换网关不影响在途单）；
 * 后续由财务在提现管理中审核，通过后才发起渠道转账。
 */
@Injectable()
export class CreateWithdrawalUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly payoutResolver: PayoutResolver,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly wechatIdentity: WechatIdentityService,
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
    if (!USER_PAYOUT_CHOICES.has(body.provider)) {
      throw new BadRequestException('提现方式仅支持支付宝或微信零钱');
    }

    const provider = await this.paymentGateway.resolvePayoutProvider(body.provider);
    const port = this.payoutResolver.resolve(provider);
    if (!port.available) {
      throw new NotImplementedException('该提现渠道暂未开通，请改用支付宝提现');
    }
    const account = await this.resolveAccount(userId, body);

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
      account,
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

  /** 收款标识：支付宝取用户填写的登录号；微信零钱取服务端已绑定的公众号 openid。 */
  private async resolveAccount(
    userId: string,
    body: CreateWithdrawalBody,
  ): Promise<string> {
    if (body.provider === PayoutProvider.Wechat) {
      const openid = await this.wechatIdentity.findOpenid(userId);
      if (!openid) {
        throw new BadRequestException('请先在微信内完成微信登录或绑定后再提现到零钱');
      }
      return openid;
    }
    const account = body.account?.trim() ?? '';
    if (!account) {
      throw new BadRequestException('请填写收款支付宝账号');
    }
    return account;
  }
}

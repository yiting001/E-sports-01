import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  WALLET_DEFAULTS,
  WalletView,
  WithdrawTaxTier,
  sanitizeWithdrawTaxTiers,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import { PaymentGatewayService } from '../payment-gateway.service';
import { WalletService } from '../wallet.service';
import { toWalletView } from '../wallet.mapper';

/**
 * 用例：获取当前用户钱包。
 * 钱包为所有角色通用，打开页面时若无则自动初始化（懒创建）；
 * 随视图下发当前提现网关可选的提现方式，前端据此渲染表单（服务端仍作最终校验）。
 */
@Injectable()
export class GetMyWalletUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  async execute(userId: string): Promise<WalletView> {
    const wallet = await this.walletService.ensureWallet(userId);
    const feeRateBp = await this.config.getNumber(
      CONFIG_KEYS.wallet.withdrawFeeRateBp,
      WALLET_DEFAULTS.withdrawFeeRateBp,
    );
    const taxTiers = sanitizeWithdrawTaxTiers(
      await this.config.getJson<WithdrawTaxTier[]>(
        CONFIG_KEYS.wallet.withdrawTaxTiers,
        [],
      ),
    );
    return toWalletView(wallet, {
      withdrawFeeRateBp: feeRateBp,
      withdrawTaxTiers: taxTiers,
      withdrawMethods: await this.paymentGateway.withdrawMethods(),
      withdrawPhoneRequired: await this.paymentGateway.withdrawPhoneRequired(),
    });
  }
}

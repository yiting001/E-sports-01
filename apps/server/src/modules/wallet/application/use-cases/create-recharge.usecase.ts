import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  CreateRechargeBody,
  CreateRechargeResult,
  RechargeStatus,
  WALLET_DEFAULTS,
  fenToYuan,
} from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  RECHARGE_ORDER_REPOSITORY,
  RechargeOrderRepository,
} from '../../domain/recharge-repository.interface';
import { RechargeOrderEntity } from '../../domain/recharge-order.entity';
import { PaymentResolver } from '../payment.resolver';
import { WalletService } from '../wallet.service';
import { buildOrderNo } from '../order-no.util';

/** 充值订单标题 */
const RECHARGE_SUBJECT = '钱包充值';

/**
 * 用例：发起充值。
 * 校验金额下限 → 定位/初始化钱包 → 落充值订单(pending) → 调对应渠道下单取二维码。
 * 真正入账在异步回调用例完成，本用例不改余额。
 */
@Injectable()
export class CreateRechargeUseCase {
  constructor(
    private readonly walletService: WalletService,
    private readonly paymentResolver: PaymentResolver,
    private readonly config: ConfigService,
    @Inject(RECHARGE_ORDER_REPOSITORY)
    private readonly rechargeRepo: RechargeOrderRepository,
  ) {}

  async execute(
    userId: string,
    body: CreateRechargeBody,
  ): Promise<CreateRechargeResult> {
    const minRecharge = await this.config.getNumber(
      CONFIG_KEYS.wallet.minRechargeFen,
      WALLET_DEFAULTS.minRechargeFen,
    );
    if (!Number.isInteger(body.amountFen) || body.amountFen < minRecharge) {
      throw new BadRequestException(
        `充值金额不得低于 ${fenToYuan(minRecharge)} 元`,
      );
    }

    const wallet = await this.walletService.ensureWallet(userId);
    const port = this.paymentResolver.resolve(body.provider);
    const outTradeNo = buildOrderNo('R');

    const order = new RechargeOrderEntity();
    order.walletId = wallet.id;
    order.outTradeNo = outTradeNo;
    order.amountFen = body.amountFen;
    order.provider = body.provider;
    order.status = RechargeStatus.Pending;
    order.providerTradeNo = null;
    const saved = await this.rechargeRepo.save(order);

    const notifyBaseUrl = await this.config.getString(
      CONFIG_KEYS.wallet.notifyBaseUrl,
      '',
    );
    const { qrCode } = await port.createRecharge({
      outTradeNo,
      amountFen: body.amountFen,
      subject: RECHARGE_SUBJECT,
      notifyUrl: notifyBaseUrl
        ? `${notifyBaseUrl}/wallet/recharge/callback/${body.provider}`
        : '',
    });

    return {
      orderId: saved.id,
      outTradeNo,
      provider: body.provider,
      qrCode,
      amountFen: body.amountFen,
      amountYuan: fenToYuan(body.amountFen),
    };
  }
}

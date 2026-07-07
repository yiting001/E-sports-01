import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  FundDirection,
  InviteRewardConfig,
  InviteRewardType,
  WalletTxnType,
  fenToYuan,
} from '@app/contracts';
import { CouponGrantService } from '../../coupon/application/coupon-grant.service';
import { WalletService } from '../../wallet/application/wallet.service';
import {
  WALLET_LEDGER,
  WalletLedger,
} from '../../wallet/domain/ledger.interface';

/**
 * 邀请奖励发放服务。
 * 按配置向指定用户发放奖励：优惠券走系统发券（不受单人限领约束），
 * 钱包金额经账务单元入账（流水类型 invite_reward）。
 * 发放失败不阻断绑定，结果文案作为快照返回供落库追溯。
 */
@Injectable()
export class InviteRewardService {
  private readonly logger = new Logger(InviteRewardService.name);

  constructor(
    private readonly couponGrant: CouponGrantService,
    private readonly walletService: WalletService,
    @Inject(WALLET_LEDGER)
    private readonly ledger: WalletLedger,
  ) {}

  /** 发放一侧奖励，返回发放结果文案快照（不发放为空串） */
  async issue(userId: string, cfg: InviteRewardConfig): Promise<string> {
    try {
      if (cfg.rewardType === InviteRewardType.Coupon) {
        const title = await this.couponGrant.grant(userId, cfg.couponId);
        return `优惠券「${title}」`;
      }
      if (cfg.rewardType === InviteRewardType.Wallet && cfg.amountFen > 0) {
        const wallet = await this.walletService.ensureWallet(userId);
        await this.ledger.adjustBalance({
          walletId: wallet.id,
          direction: FundDirection.In,
          amountFen: cfg.amountFen,
          remark: '邀请好友奖励',
          type: WalletTxnType.InviteReward,
        });
        return `钱包入账 ${fenToYuan(cfg.amountFen)} 元`;
      }
      return '';
    } catch (err) {
      this.logger.warn(
        `邀请奖励发放失败 user=${userId}: ${(err as Error).message}`,
      );
      return `发放失败：${(err as Error).message}`;
    }
  }
}

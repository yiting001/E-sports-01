import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BoosterView,
  FundDirection,
  WalletTxnType,
  fenToYuan,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { WalletService } from '../../../wallet/application/wallet.service';
import {
  WALLET_LEDGER,
  WalletLedger,
} from '../../../wallet/domain/ledger.interface';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterView } from '../booster.mapper';

/**
 * 用例：管理端退还打手押金。
 * 已缴押金全额退回打手钱包余额，经 WalletLedger 记 deposit_refund 入账流水。
 */
@Injectable()
export class RefundDepositUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    @Inject(WALLET_LEDGER)
    private readonly ledger: WalletLedger,
    private readonly walletService: WalletService,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(id: string): Promise<BoosterView> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundException('入驻申请不存在');
    }
    if (record.depositFen <= 0) {
      throw new ConflictException('该打手暂无可退押金');
    }
    const refundFen = record.depositFen;
    const wallet = await this.walletService.ensureWallet(record.userId);
    await this.ledger.adjustBalance({
      walletId: wallet.id,
      direction: FundDirection.In,
      amountFen: refundFen,
      type: WalletTxnType.DepositRefund,
      remark: `打手押金退还 ${fenToYuan(refundFen)} 元`,
    });
    record.depositFen = 0;
    const saved = await this.repo.save(record);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([saved.userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(saved.userId));
  }
}

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  BoosterStatus,
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
 * 用例：打手缴纳押金（区间内自选金额）。
 * 仅已通过入驻审核的打手可缴；缴后累计不得超过配置的最高交付额，
 * 从钱包余额扣除，经 WalletLedger 记 deposit 出账流水（余额不足由账务单元拒绝）。
 */
@Injectable()
export class PayDepositUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    @Inject(WALLET_LEDGER)
    private readonly ledger: WalletLedger,
    private readonly walletService: WalletService,
    private readonly users: UserDirectory,
    private readonly policy: BoosterPolicyService,
  ) {}

  async execute(userId: string, amountFen: number): Promise<BoosterView> {
    const record = await this.repo.findByUserId(userId);
    if (!record || record.status !== BoosterStatus.Approved) {
      throw new ConflictException('请先通过打手入驻审核');
    }
    const { maxFen } = await this.policy.getDepositPolicy();
    if (record.depositFen >= maxFen) {
      throw new ConflictException('押金已达最高交付额，无需继续缴纳');
    }
    if (record.depositFen + amountFen > maxFen) {
      throw new BadRequestException(
        `缴后累计不得超过最高交付额 ${fenToYuan(maxFen)} 元，本次最多可缴 ${fenToYuan(maxFen - record.depositFen)} 元`,
      );
    }
    const wallet = await this.walletService.ensureWallet(userId);
    await this.ledger.adjustBalance({
      walletId: wallet.id,
      direction: FundDirection.Out,
      amountFen,
      type: WalletTxnType.Deposit,
      remark: `打手押金缴纳 ${fenToYuan(amountFen)} 元`,
    });
    record.depositFen += amountFen;
    const saved = await this.repo.save(record);
    const [profiles, tiers] = await Promise.all([
      this.users.resolveProfiles([userId]),
      this.policy.getLevelTiers(),
    ]);
    return toBoosterView(saved, tiers, profiles.get(userId));
  }
}

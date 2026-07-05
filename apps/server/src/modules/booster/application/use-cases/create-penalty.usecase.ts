import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePenaltyBody,
  FundDirection,
  PenaltySource,
  PenaltyView,
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
import {
  BOOSTER_PENALTY_REPOSITORY,
  BoosterPenaltyRepository,
} from '../../domain/penalty-repository.interface';
import { toPenaltyView } from '../penalty.mapper';

/**
 * 用例：财务对打手创建罚款。
 * 来源为余额时经 WalletLedger 记 penalty 出账流水（余额不足由账务单元拒绝）；
 * 来源为押金时直接核减已缴押金（押金由平台代管，无需走钱包）。
 * 罚款记录留档：金额、来源、理由、关联订单号、操作人。
 */
@Injectable()
export class CreatePenaltyUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly boosterRepo: BoosterRepository,
    @Inject(BOOSTER_PENALTY_REPOSITORY)
    private readonly penaltyRepo: BoosterPenaltyRepository,
    @Inject(WALLET_LEDGER)
    private readonly ledger: WalletLedger,
    private readonly walletService: WalletService,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    operatorId: string,
    payload: CreatePenaltyBody,
  ): Promise<PenaltyView> {
    const record = await this.boosterRepo.findByUserId(payload.boosterUserId);
    if (!record) {
      throw new NotFoundException('该用户不是入驻打手');
    }
    const reason = payload.reason.trim();
    if (!reason) {
      throw new BadRequestException('罚款理由不能为空');
    }
    if (payload.source === PenaltySource.Deposit) {
      if (record.depositFen < payload.amountFen) {
        throw new BadRequestException('押金余额不足，无法从押金扣除');
      }
      record.depositFen -= payload.amountFen;
      await this.boosterRepo.save(record);
    } else {
      const wallet = await this.walletService.ensureWallet(
        payload.boosterUserId,
      );
      await this.ledger.adjustBalance({
        walletId: wallet.id,
        direction: FundDirection.Out,
        amountFen: payload.amountFen,
        type: WalletTxnType.Penalty,
        remark: `罚款 ${fenToYuan(payload.amountFen)} 元：${reason}`,
      });
    }
    const saved = await this.penaltyRepo.save(
      this.penaltyRepo.create({
        boosterUserId: payload.boosterUserId,
        orderNo: payload.orderNo?.trim() ?? '',
        amountFen: payload.amountFen,
        source: payload.source,
        reason,
        createdBy: operatorId,
      }),
    );
    const profiles = await this.users.resolveProfiles([saved.boosterUserId]);
    return toPenaltyView(saved, profiles.get(saved.boosterUserId));
  }
}

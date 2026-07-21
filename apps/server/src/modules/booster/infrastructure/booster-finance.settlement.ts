import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BoosterStatus,
  FundDirection,
  PenaltySource,
  WalletTxnType,
  fenToYuan,
} from '@app/contracts';
import { DataSource, type FindOptionsWhere } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import {
  WALLET_TRANSACTION_PARTICIPANT,
  type WalletTransactionParticipant,
} from '../../wallet/infrastructure/wallet-transaction.participant';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';
import {
  type BoosterFinanceSettlement,
  type CreateBoosterPenaltyInput,
  type CreateBoosterPenaltyResult,
  type PayBoosterDepositInput,
  type PayBoosterDepositResult,
  type RefundBoosterDepositResult,
} from '../domain/booster-finance-settlement.interface';
import { BoosterPenaltyEntity } from '../domain/booster-penalty.entity';

/** 统一锁定打手后，在同一事务内完成押金、钱包流水和罚款变更。 */
@Injectable()
export class TypeormBoosterFinanceSettlement implements BoosterFinanceSettlement {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenant: TenantContextService,
    @Inject(WALLET_TRANSACTION_PARTICIPANT)
    private readonly walletTransaction: WalletTransactionParticipant,
  ) {}

  payDeposit(input: PayBoosterDepositInput): Promise<PayBoosterDepositResult> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BoosterApplicationEntity);
      const booster = await repository.findOne({
        where: this.scopedWhere({ userId: input.userId }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!booster || booster.status !== BoosterStatus.Approved) {
        return { outcome: 'not_approved' };
      }
      if (booster.depositFen >= input.maxFen) {
        return { outcome: 'maximum_reached' };
      }
      if (booster.depositFen + input.amountFen > input.maxFen) {
        return {
          outcome: 'maximum_exceeded',
          availableFen: input.maxFen - booster.depositFen,
        };
      }

      const walletResult = await this.walletTransaction.adjust(manager, {
        tenantId: booster.tenantId,
        userId: booster.userId,
        amountFen: input.amountFen,
        direction: FundDirection.Out,
        type: WalletTxnType.Deposit,
        remark: `打手押金缴纳 ${fenToYuan(input.amountFen)} 元`,
        createIfMissing: true,
      });
      if (walletResult.outcome === 'not_found') {
        return { outcome: 'wallet_not_found' };
      }
      if (walletResult.outcome === 'insufficient') {
        return { outcome: 'insufficient_balance' };
      }

      const depositFen = booster.depositFen + input.amountFen;
      await repository.update({ id: booster.id, tenantId: booster.tenantId }, { depositFen });
      return {
        outcome: 'paid',
        booster: await repository.findOneByOrFail({
          id: booster.id,
          tenantId: booster.tenantId,
        }),
      };
    });
  }

  refundDeposit(applicationId: string): Promise<RefundBoosterDepositResult> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BoosterApplicationEntity);
      const booster = await repository.findOne({
        where: this.scopedWhere({ id: applicationId }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!booster) {
        return { outcome: 'not_found' };
      }
      if (booster.depositFen <= 0) {
        return { outcome: 'empty' };
      }

      const amountFen = booster.depositFen;
      const walletResult = await this.walletTransaction.adjust(manager, {
        tenantId: booster.tenantId,
        userId: booster.userId,
        amountFen,
        direction: FundDirection.In,
        type: WalletTxnType.DepositRefund,
        remark: `打手押金退还 ${fenToYuan(amountFen)} 元`,
        createIfMissing: true,
      });
      if (walletResult.outcome !== 'adjusted') {
        return { outcome: 'wallet_not_found' };
      }

      await repository.update({ id: booster.id, tenantId: booster.tenantId }, { depositFen: 0 });
      return {
        outcome: 'refunded',
        booster: await repository.findOneByOrFail({
          id: booster.id,
          tenantId: booster.tenantId,
        }),
        amountFen,
      };
    });
  }

  createPenalty(input: CreateBoosterPenaltyInput): Promise<CreateBoosterPenaltyResult> {
    return this.dataSource.transaction(async (manager) => {
      const boosterRepository = manager.getRepository(BoosterApplicationEntity);
      const booster = await boosterRepository.findOne({
        where: this.scopedWhere({ userId: input.boosterUserId }),
        lock: { mode: 'pessimistic_write' },
      });
      if (!booster) {
        return { outcome: 'booster_not_found' };
      }

      if (input.source === PenaltySource.Deposit) {
        if (booster.depositFen < input.amountFen) {
          return { outcome: 'insufficient_deposit' };
        }
        const depositFen = booster.depositFen - input.amountFen;
        await boosterRepository.update(
          { id: booster.id, tenantId: booster.tenantId },
          { depositFen },
        );
        booster.depositFen = depositFen;
      } else {
        const walletResult = await this.walletTransaction.adjust(manager, {
          tenantId: booster.tenantId,
          userId: booster.userId,
          amountFen: input.amountFen,
          direction: FundDirection.Out,
          type: WalletTxnType.Penalty,
          remark: `罚款 ${fenToYuan(input.amountFen)} 元：${input.reason}`,
          createIfMissing: true,
        });
        if (walletResult.outcome === 'not_found') {
          return { outcome: 'wallet_not_found' };
        }
        if (walletResult.outcome === 'insufficient') {
          return { outcome: 'insufficient_balance' };
        }
      }

      const penaltyRepository = manager.getRepository(BoosterPenaltyEntity);
      const penalty = penaltyRepository.create({
        tenantId: booster.tenantId,
        feedbackId: null,
        boosterUserId: booster.userId,
        orderNo: input.orderNo,
        amountFen: input.amountFen,
        source: input.source,
        reason: input.reason,
        createdBy: input.operatorId,
      });
      return {
        outcome: 'created',
        penalty: await penaltyRepository.save(penalty),
      };
    });
  }

  private scopedWhere(
    where: Pick<FindOptionsWhere<BoosterApplicationEntity>, 'id' | 'userId'>,
  ): FindOptionsWhere<BoosterApplicationEntity> {
    const tenantId = this.tenant.scopeId();
    return tenantId ? { ...where, tenantId } : where;
  }
}

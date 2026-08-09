import assert from 'node:assert/strict';
import test from 'node:test';
import { WalletTxnType } from '@app/contracts';
import { GetMyBoosterFundsUseCase } from '../../src/modules/booster/application/use-cases/get-my-booster-funds.usecase';
import type { BoosterApplicationEntity } from '../../src/modules/booster/domain/booster-application.entity';
import type { BoosterRepository } from '../../src/modules/booster/domain/booster-repository.interface';
import type { BoosterPenaltyRepository } from '../../src/modules/booster/domain/penalty-repository.interface';
import { WalletFinanceReadService } from '../../src/modules/wallet/application/wallet-finance-read.service';
import type { WalletEntity } from '../../src/modules/wallet/domain/wallet.entity';
import type { WalletRepository } from '../../src/modules/wallet/domain/wallet-repository.interface';
import type { WalletTransactionRepository } from '../../src/modules/wallet/domain/transaction-repository.interface';
import type { WithdrawalOrderRepository } from '../../src/modules/wallet/domain/withdrawal-repository.interface';

function createFinanceService(options: {
  wallet: WalletEntity | null;
  frozenFen?: number;
  commissionByRange?: (from?: Date, to?: Date) => number;
}): { service: WalletFinanceReadService; queriedTypes: WalletTxnType[] } {
  const queriedTypes: WalletTxnType[] = [];
  const walletRepo = {
    findByUserId: async () => options.wallet,
  } as unknown as WalletRepository;
  const txnRepo = {
    sumInboundByType: async (
      _walletId: string,
      type: WalletTxnType,
      from?: Date,
      to?: Date,
    ) => {
      queriedTypes.push(type);
      return options.commissionByRange?.(from, to) ?? 0;
    },
  } as unknown as WalletTransactionRepository;
  const withdrawalRepo = {
    sumFrozenByWallet: async () => options.frozenFen ?? 0,
  } as unknown as WithdrawalOrderRepository;
  return {
    service: new WalletFinanceReadService(walletRepo, txnRepo, withdrawalRepo),
    queriedTypes,
  };
}

function createUseCase(options: {
  record: Partial<BoosterApplicationEntity> | null;
  finance: WalletFinanceReadService;
  penaltyFen?: number;
}): GetMyBoosterFundsUseCase {
  const boosterRepo = {
    findByUserId: async () => options.record,
  } as unknown as BoosterRepository;
  const penaltyRepo = {
    sumByBoosterUserId: async () => options.penaltyFen ?? 0,
  } as unknown as BoosterPenaltyRepository;
  return new GetMyBoosterFundsUseCase(boosterRepo, penaltyRepo, options.finance);
}

test('资金聚合汇总押金、余额、冻结、结算与罚款', async () => {
  const { service, queriedTypes } = createFinanceService({
    wallet: { id: 'wallet-1', balanceFen: 12345 } as WalletEntity,
    frozenFen: 5000,
    commissionByRange: (from, to) => {
      if (!from && !to) return 90000;
      if (from && to) return 20000;
      return 30000;
    },
  });
  const useCase = createUseCase({
    record: { depositFen: 50000 } as BoosterApplicationEntity,
    finance: service,
    penaltyFen: 700,
  });

  const view = await useCase.execute('booster-id');

  assert.deepEqual(view, {
    depositFen: 50000,
    balanceFen: 12345,
    frozenFen: 5000,
    totalCommissionFen: 90000,
    monthCommissionFen: 30000,
    lastMonthCommissionFen: 20000,
    penaltyPaidFen: 700,
  });
  assert.deepEqual(queriedTypes, [
    WalletTxnType.Commission,
    WalletTxnType.Commission,
    WalletTxnType.Commission,
  ]);
});

test('未入驻且未开通钱包时全部按零值返回且不查询流水', async () => {
  const { service, queriedTypes } = createFinanceService({ wallet: null });
  const useCase = createUseCase({ record: null, finance: service });

  const view = await useCase.execute('user-without-wallet');

  assert.deepEqual(view, {
    depositFen: 0,
    balanceFen: 0,
    frozenFen: 0,
    totalCommissionFen: 0,
    monthCommissionFen: 0,
    lastMonthCommissionFen: 0,
    penaltyPaidFen: 0,
  });
  assert.deepEqual(queriedTypes, []);
});

import { Injectable } from '@nestjs/common';
import {
  FundDirection,
  WALLET_TRANSACTION_LIMITS,
  WalletStatus,
  WalletTxnType,
} from '@app/contracts';
import { EntityManager } from 'typeorm';
import { WalletEntity } from '../domain/wallet.entity';
import { WalletTransactionEntity } from '../domain/wallet-transaction.entity';

export const WALLET_TRANSACTION_PARTICIPANT = Symbol('WALLET_TRANSACTION_PARTICIPANT');

export interface AdjustWalletTransactionInput {
  tenantId: string;
  userId: string;
  amountFen: number;
  direction: FundDirection;
  type: WalletTxnType;
  remark: string;
  bizOrderId?: string | null;
  createIfMissing: boolean;
}

export type AdjustWalletTransactionResult =
  | { outcome: 'adjusted'; balanceAfterFen: number }
  | { outcome: 'not_found' }
  | { outcome: 'insufficient' };

/** 供跨聚合事务复用的钱包行锁、余额调整和流水写入端口。 */
export interface WalletTransactionParticipant {
  adjust(
    manager: EntityManager,
    input: AdjustWalletTransactionInput,
  ): Promise<AdjustWalletTransactionResult>;
}

@Injectable()
export class TypeormWalletTransactionParticipant implements WalletTransactionParticipant {
  async adjust(
    manager: EntityManager,
    input: AdjustWalletTransactionInput,
  ): Promise<AdjustWalletTransactionResult> {
    const walletRepository = manager.getRepository(WalletEntity);
    if (input.createIfMissing) {
      await walletRepository
        .createQueryBuilder()
        .insert()
        .values({
          tenantId: input.tenantId,
          userId: input.userId,
          balanceFen: 0,
          totalRechargeFen: 0,
          totalWithdrawFen: 0,
          status: WalletStatus.Active,
        })
        .orIgnore()
        .execute();
    }

    const wallet = await walletRepository.findOne({
      where: { tenantId: input.tenantId, userId: input.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      return { outcome: 'not_found' };
    }
    if (input.direction === FundDirection.Out && wallet.balanceFen < input.amountFen) {
      return { outcome: 'insufficient' };
    }

    wallet.balanceFen += input.direction === FundDirection.In ? input.amountFen : -input.amountFen;
    const savedWallet = await walletRepository.save(wallet);
    const transactionRepository = manager.getRepository(WalletTransactionEntity);
    const transaction = transactionRepository.create({
      tenantId: input.tenantId,
      walletId: savedWallet.id,
      type: input.type,
      direction: input.direction,
      amountFen: input.amountFen,
      balanceAfterFen: savedWallet.balanceFen,
      bizOrderId: input.bizOrderId ?? null,
      remark: input.remark.slice(0, WALLET_TRANSACTION_LIMITS.remarkMax),
    });
    await transactionRepository.save(transaction);
    return { outcome: 'adjusted', balanceAfterFen: savedWallet.balanceFen };
  }
}

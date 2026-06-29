import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, WalletTransactionView } from '@app/contracts';
import {
  WALLET_REPOSITORY,
  WalletRepository,
} from '../../domain/wallet-repository.interface';
import {
  WALLET_TRANSACTION_REPOSITORY,
  WalletTransactionRepository,
} from '../../domain/transaction-repository.interface';
import { toTransactionView } from '../transaction.mapper';

/**
 * 用例：管理端分页查询指定用户的钱包流水（明细）。
 * 仅读取，不自动创建钱包；用户未开通钱包时返回空页，避免管理动作产生副作用。
 */
@Injectable()
export class ListUserTransactionsUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepository,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly txnRepo: WalletTransactionRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      return { list: [], total: 0, page, pageSize };
    }
    const [rows, total] = await this.txnRepo.paginateByWallet(
      wallet.id,
      skip,
      pageSize,
    );
    return { list: rows.map(toTransactionView), total, page, pageSize };
  }
}

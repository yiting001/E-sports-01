import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, WalletTransactionView } from '@app/contracts';
import {
  WALLET_TRANSACTION_REPOSITORY,
  WalletTransactionRepository,
} from '../../domain/transaction-repository.interface';
import { WalletService } from '../wallet.service';
import { toTransactionView } from '../transaction.mapper';

/**
 * 用例：分页查询当前用户钱包流水（明细）。
 * 先定位/初始化钱包，再按钱包过滤分页，保证只见本人流水。
 */
@Injectable()
export class ListTransactionsUseCase {
  constructor(
    private readonly walletService: WalletService,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly txnRepo: WalletTransactionRepository,
  ) {}

  async execute(
    userId: string,
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<WalletTransactionView>> {
    const wallet = await this.walletService.ensureWallet(userId);
    const [rows, total] = await this.txnRepo.paginateByWallet(
      wallet.id,
      skip,
      pageSize,
    );
    return { list: rows.map(toTransactionView), total, page, pageSize };
  }
}

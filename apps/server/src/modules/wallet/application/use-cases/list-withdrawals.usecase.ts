import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  WithdrawalAdminView,
  WithdrawalStatus,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  WALLET_REPOSITORY,
  WalletRepository,
} from '../../domain/wallet-repository.interface';
import {
  WITHDRAWAL_ORDER_REPOSITORY,
  WithdrawalOrderRepository,
} from '../../domain/withdrawal-repository.interface';
import { toWithdrawalAdminView } from '../withdrawal-admin.mapper';

/**
 * 用例：管理端分页查询提现工单（可按状态过滤）。
 * 提现单只存 walletId，经钱包反查归属用户后补全展示资料。
 */
@Injectable()
export class ListWithdrawalsUseCase {
  constructor(
    private readonly users: UserDirectory,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepository,
    @Inject(WITHDRAWAL_ORDER_REPOSITORY)
    private readonly withdrawalRepo: WithdrawalOrderRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    status?: WithdrawalStatus,
  ): Promise<PaginatedResult<WithdrawalAdminView>> {
    const [orders, total] = await this.withdrawalRepo.paginate(
      skip,
      pageSize,
      status,
    );
    const wallets = await this.walletRepo.findByIds(
      orders.map((o) => o.walletId),
    );
    const userIdByWallet = new Map(wallets.map((w) => [w.id, w.userId]));
    const profiles = await this.users.resolveProfiles([
      ...userIdByWallet.values(),
    ]);
    const list = orders.map((order) => {
      const userId = userIdByWallet.get(order.walletId) ?? '';
      const profile = profiles.get(userId);
      return toWithdrawalAdminView(order, {
        userId,
        username: profile?.username ?? '',
        nickname: profile?.nickname ?? '',
      });
    });
    return { list, total, page, pageSize };
  }
}

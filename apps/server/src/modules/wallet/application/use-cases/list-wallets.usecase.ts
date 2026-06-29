import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, WalletAdminView } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  WALLET_REPOSITORY,
  WalletRepository,
} from '../../domain/wallet-repository.interface';
import { toWalletAdminView } from '../wallet-admin.mapper';

/**
 * 用例：管理端分页查询所有用户钱包（按用户聚合）。
 * 以用户为主表分页（复用用户目录的关键字检索），左联其钱包余额；
 * 未开通钱包的用户以零值展示，保证「所有用户」均可见、可管理。
 */
@Injectable()
export class ListWalletsUseCase {
  constructor(
    private readonly users: UserDirectory,
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<WalletAdminView>> {
    const [profiles, total] = await this.users.paginateProfiles(
      skip,
      pageSize,
      keyword,
    );
    const wallets = await this.walletRepo.findByUserIds(
      profiles.map((p) => p.id),
    );
    const walletByUser = new Map(wallets.map((w) => [w.userId, w]));
    const list = profiles.map((p) =>
      toWalletAdminView(
        { userId: p.id, username: p.username, nickname: p.nickname },
        walletByUser.get(p.id) ?? null,
      ),
    );
    return { list, total, page, pageSize };
  }
}

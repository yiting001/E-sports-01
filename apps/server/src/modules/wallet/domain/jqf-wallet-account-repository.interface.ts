import { JqfWalletAccountEntity } from './jqf-wallet-account.entity';

export const JQF_WALLET_ACCOUNT_REPOSITORY = Symbol('JQF_WALLET_ACCOUNT_REPOSITORY');

/** 计全付钱包开户记录仓储端口 */
export interface JqfWalletAccountRepository {
  findByUser(userId: string): Promise<JqfWalletAccountEntity | null>;
  save(record: JqfWalletAccountEntity): Promise<JqfWalletAccountEntity>;
}

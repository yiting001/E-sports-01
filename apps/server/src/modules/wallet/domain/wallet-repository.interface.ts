import { WalletEntity } from './wallet.entity';

/** 钱包仓储注入令牌（领域层只依赖接口，实现由基础设施层提供） */
export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

/** 钱包仓储接口 */
export interface WalletRepository {
  /** 按用户查钱包（租户内唯一），不存在返回 null */
  findByUserId(userId: string): Promise<WalletEntity | null>;
  /** 构造一个归属指定用户的新钱包实体（未持久化） */
  create(userId: string): WalletEntity;
  save(wallet: WalletEntity): Promise<WalletEntity>;
}

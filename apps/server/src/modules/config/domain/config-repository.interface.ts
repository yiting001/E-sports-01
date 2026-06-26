import { ConfigItem } from './config-item.entity';

/** 配置仓储注入令牌（领域层只依赖接口，实现由基础设施层提供） */
export const CONFIG_REPOSITORY = Symbol('CONFIG_REPOSITORY');

/**
 * 配置仓储接口。
 * 领域/应用层依赖此抽象，便于替换持久化实现与单元测试。
 */
export interface ConfigRepository {
  findByKey(key: string): Promise<ConfigItem | null>;
  findAll(): Promise<ConfigItem[]>;
  findByGroup(group: string): Promise<ConfigItem[]>;
  /** 不存在则创建，存在则更新值/备注 */
  upsert(item: Partial<ConfigItem> & { key: string }): Promise<ConfigItem>;
  /** 批量创建缺失项（用于默认值播种），返回新建数量 */
  createMissing(items: Array<Partial<ConfigItem> & { key: string }>): Promise<number>;
  remove(key: string): Promise<void>;
}

import { StorageDriver } from '@app/contracts';

/** 存储写入入参（key 由应用层统一生成，驱动只负责落地字节） */
export interface StoragePutInput {
  /** 对象 key（相对路径/对象名） */
  key: string;
  /** 文件二进制内容 */
  buffer: Buffer;
  /** MIME 类型 */
  mimeType: string;
}

/**
 * 存储驱动端口（策略模式抽象）。
 * 本地、OSS 等实现统一遵循该接口，运行时由配置中心选择具体策略，
 * 新增存储方式只需实现该接口并注册，无需改动上层用例。
 */
export interface StoragePort {
  /** 驱动标识，与配置中心 upload.driver 取值对应 */
  readonly driver: StorageDriver;
  /** 落地文件并返回可访问 URL */
  put(input: StoragePutInput): Promise<string>;
  /** 按 key 删除存储对象 */
  remove(key: string): Promise<void>;
}

/** 存储驱动集合注入令牌（聚合所有已注册策略，供解析器按配置挑选） */
export const STORAGE_PORTS = Symbol('STORAGE_PORTS');

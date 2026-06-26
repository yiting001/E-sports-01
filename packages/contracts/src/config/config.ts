/** 配置项的值类型，读取时按此做反序列化 */
export enum ConfigValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Json = 'json',
}

/**
 * 配置分组。
 * 除数据库连接走 .env 外，其余配置统一入库并按组管理。
 */
export enum ConfigGroup {
  System = 'system',
  Auth = 'auth',
  Upload = 'upload',
  Im = 'im',
}

/** 配置项对外结构（敏感项的值在传输前会被脱敏） */
export interface ConfigItemView {
  key: string;
  value: string;
  type: ConfigValueType;
  group: ConfigGroup;
  remark: string;
  /** 是否敏感（如密钥），敏感项在列表中不回显原值 */
  secret: boolean;
}

/**
 * 全平台配置键常量。
 * 任何模块需要可配置参数时都应在此登记，杜绝散落的硬编码。
 */
export const CONFIG_KEYS = {
  auth: {
    accessTokenTtl: 'auth.accessTokenTtl',
    refreshTokenTtl: 'auth.refreshTokenTtl',
  },
  upload: {
    driver: 'upload.driver',
    maxFileSize: 'upload.maxFileSize',
    localBaseUrl: 'upload.local.baseUrl',
    localDir: 'upload.local.dir',
    ossEndpoint: 'upload.oss.endpoint',
    ossBucket: 'upload.oss.bucket',
    ossAccessKeyId: 'upload.oss.accessKeyId',
    ossAccessKeySecret: 'upload.oss.accessKeySecret',
  },
  im: {
    historyLimit: 'im.historyLimit',
  },
} as const;

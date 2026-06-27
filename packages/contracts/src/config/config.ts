/** 配置项的值类型，读取时按此做反序列化 */
export enum ConfigValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Json = 'json',
  /** 富文本：值为 HTML 字符串，编辑时用富文本编辑器，读取与 string 一致 */
  RichText = 'richtext',
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
  Observability = 'observability',
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
    /** 群聊最大成员数 */
    groupMaxMembers: 'im.group.maxMembers',
    /** 客服会话是否在访客发起时自动分配在线坐席 */
    serviceAutoAssign: 'im.service.autoAssign',
    /** 坐席接入客服会话后自动发送的欢迎语 */
    serviceWelcome: 'im.service.welcome',
  },
  log: {
    /** 是否将访问/错误/应用日志异步落库 */
    persistEnabled: 'log.persistEnabled',
    /** 持久化的最低级别（低于该级别的应用日志不入库） */
    level: 'log.level',
    /** 访问日志采样率 0~1，1 表示全量 */
    requestSampleRate: 'log.requestSampleRate',
    /** 日志保留天数，清理接口据此删除过期日志 */
    retentionDays: 'log.retentionDays',
    /** 不记录访问日志的路径前缀（JSON 字符串数组） */
    excludePaths: 'log.excludePaths',
  },
} as const;

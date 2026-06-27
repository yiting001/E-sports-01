import {
  CONFIG_KEYS,
  ConfigGroup,
  ConfigValueType,
  LogLevel,
  StorageDriver,
} from '@app/contracts';

/** 默认配置项的形状 */
export interface ConfigDefault {
  key: string;
  value: string;
  type: ConfigValueType;
  group: ConfigGroup;
  remark: string;
  secret?: boolean;
}

/** 历史值迁移项的形状：把库中旧配置就地改写为新约定（值/类型，均为幂等） */
export interface ConfigMigration {
  key: string;
  /** 命中此旧值才改写值；不填则不改值（保留人工修改） */
  legacyValue?: string;
  /** 与 legacyValue 配合的新值 */
  newValue?: string;
  /** 期望类型，库中类型不一致则纠正（不依赖旧值，便于单位/形态变更） */
  expectedType?: ConfigValueType;
}

/**
 * 历史配置迁移清单（幂等）。
 * - upload.maxFileSize：由「字节」改为「MB」，旧默认 10485760 字节 → 10 MB（仅当仍为旧默认值时改写）。
 * - im.service.welcome：由 string 改为 richtext（仅纠正类型，保留已编辑的欢迎语内容）。
 */
export const CONFIG_MIGRATIONS: ConfigMigration[] = [
  {
    key: CONFIG_KEYS.upload.maxFileSize,
    legacyValue: String(10 * 1024 * 1024),
    newValue: '10',
  },
  {
    key: CONFIG_KEYS.im.serviceWelcome,
    expectedType: ConfigValueType.RichText,
  },
];

/**
 * 平台默认配置清单。
 * 启动时若库中缺失则播种到配置中心；此后业务模块一律从配置中心读取，
 * 这里是默认值的“唯一登记处”，从根本上消除散落的硬编码。
 */
export const DEFAULT_CONFIGS: ConfigDefault[] = [
  {
    key: CONFIG_KEYS.auth.accessTokenTtl,
    value: '3600',
    type: ConfigValueType.Number,
    group: ConfigGroup.Auth,
    remark: '访问令牌有效期（秒）',
  },
  {
    key: CONFIG_KEYS.auth.refreshTokenTtl,
    value: '604800',
    type: ConfigValueType.Number,
    group: ConfigGroup.Auth,
    remark: '刷新令牌有效期（秒）',
  },
  {
    key: CONFIG_KEYS.upload.driver,
    value: StorageDriver.Local,
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: '文件存储驱动：local / oss，默认 local',
  },
  {
    key: CONFIG_KEYS.upload.maxFileSize,
    value: '10',
    type: ConfigValueType.Number,
    group: ConfigGroup.Upload,
    remark: '单文件最大体积（MB）',
  },
  {
    key: CONFIG_KEYS.upload.localBaseUrl,
    value: 'http://127.0.0.1:3000/static',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: '本地存储对外访问基础 URL',
  },
  {
    key: CONFIG_KEYS.upload.localDir,
    value: 'uploads',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: '本地存储根目录（相对工作目录）',
  },
  {
    key: CONFIG_KEYS.upload.ossEndpoint,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: 'OSS Endpoint',
  },
  {
    key: CONFIG_KEYS.upload.ossBucket,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: 'OSS Bucket',
  },
  {
    key: CONFIG_KEYS.upload.ossAccessKeyId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: 'OSS AccessKeyId',
    secret: true,
  },
  {
    key: CONFIG_KEYS.upload.ossAccessKeySecret,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: 'OSS AccessKeySecret',
    secret: true,
  },
  {
    key: CONFIG_KEYS.im.historyLimit,
    value: '50',
    type: ConfigValueType.Number,
    group: ConfigGroup.Im,
    remark: '拉取历史消息默认条数',
  },
  {
    key: CONFIG_KEYS.im.groupMaxMembers,
    value: '100',
    type: ConfigValueType.Number,
    group: ConfigGroup.Im,
    remark: '单个群聊最大成员数',
  },
  {
    key: CONFIG_KEYS.im.serviceAutoAssign,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Im,
    remark: '访客发起客服会话时是否自动分配在线坐席',
  },
  {
    key: CONFIG_KEYS.im.serviceWelcome,
    value: '<p>您好，很高兴为您服务，请问有什么可以帮您？</p>',
    type: ConfigValueType.RichText,
    group: ConfigGroup.Im,
    remark: '坐席接入客服会话后自动发送的欢迎语（支持富文本/图片/视频）',
  },
  {
    key: CONFIG_KEYS.log.persistEnabled,
    value: 'true',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Observability,
    remark: '是否将访问/错误/应用日志异步落库',
  },
  {
    key: CONFIG_KEYS.log.level,
    value: LogLevel.Info,
    type: ConfigValueType.String,
    group: ConfigGroup.Observability,
    remark: '日志持久化最低级别：debug/info/warn/error',
  },
  {
    key: CONFIG_KEYS.log.requestSampleRate,
    value: '1',
    type: ConfigValueType.Number,
    group: ConfigGroup.Observability,
    remark: '访问日志采样率 0~1，1 表示全量',
  },
  {
    key: CONFIG_KEYS.log.retentionDays,
    value: '14',
    type: ConfigValueType.Number,
    group: ConfigGroup.Observability,
    remark: '日志保留天数，清理接口据此删除过期日志',
  },
  {
    key: CONFIG_KEYS.log.excludePaths,
    value: JSON.stringify(['/api/observability/logs']),
    type: ConfigValueType.Json,
    group: ConfigGroup.Observability,
    remark: '不记录访问日志的路径前缀（JSON 数组）',
  },
];

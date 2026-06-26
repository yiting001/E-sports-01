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
    value: String(10 * 1024 * 1024),
    type: ConfigValueType.Number,
    group: ConfigGroup.Upload,
    remark: '单文件最大字节数',
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
    value: '您好，很高兴为您服务，请问有什么可以帮您？',
    type: ConfigValueType.String,
    group: ConfigGroup.Im,
    remark: '坐席接入客服会话后自动发送的欢迎语',
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

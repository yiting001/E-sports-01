import {
  CONFIG_KEYS,
  ConfigGroup,
  ConfigValueType,
  DEFAULT_APP_NAME,
  LogLevel,
  SmsProvider,
  StorageDriver,
  WALLET_DEFAULTS,
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
    key: CONFIG_KEYS.system.appName,
    value: DEFAULT_APP_NAME,
    type: ConfigValueType.String,
    group: ConfigGroup.System,
    remark: '软件名称（浏览器标题、登录页、侧边栏显示）',
  },
  {
    key: CONFIG_KEYS.system.appLogo,
    value: '',
    type: ConfigValueType.Image,
    group: ConfigGroup.System,
    remark: '软件图标（上传图片，作 logo 与 favicon）',
  },
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
    key: CONFIG_KEYS.sms.provider,
    value: SmsProvider.Log,
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '短信服务商：aliyun / tencent / volcano / log（默认 log，仅打日志不真正发送）',
  },
  {
    key: CONFIG_KEYS.sms.codeLength,
    value: '6',
    type: ConfigValueType.Number,
    group: ConfigGroup.Sms,
    remark: '验证码位数',
  },
  {
    key: CONFIG_KEYS.sms.codeTtl,
    value: '300',
    type: ConfigValueType.Number,
    group: ConfigGroup.Sms,
    remark: '验证码有效期（秒）',
  },
  {
    key: CONFIG_KEYS.sms.sendInterval,
    value: '60',
    type: ConfigValueType.Number,
    group: ConfigGroup.Sms,
    remark: '同一手机号两次发送的最小间隔（秒）',
  },
  {
    key: CONFIG_KEYS.sms.countryCode,
    value: '+86',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '国际区号（E.164），腾讯云等需带区号的服务商使用',
  },
  {
    key: CONFIG_KEYS.sms.aliyunAccessKeyId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '阿里云短信 AccessKeyId',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.aliyunAccessKeySecret,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '阿里云短信 AccessKeySecret',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.aliyunSignName,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '阿里云短信签名',
  },
  {
    key: CONFIG_KEYS.sms.aliyunTemplateCode,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '阿里云短信模板 Code（模板变量需用 ${code}）',
  },
  {
    key: CONFIG_KEYS.sms.aliyunEndpoint,
    value: 'dysmsapi.aliyuncs.com',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '阿里云短信服务 Endpoint',
  },
  {
    key: CONFIG_KEYS.sms.tencentSecretId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云 SecretId',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.tencentSecretKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云 SecretKey',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.tencentSdkAppId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云短信应用 SdkAppId',
  },
  {
    key: CONFIG_KEYS.sms.tencentSignName,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云短信签名',
  },
  {
    key: CONFIG_KEYS.sms.tencentTemplateId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云短信模板 ID（模板变量按顺序，第一个为验证码）',
  },
  {
    key: CONFIG_KEYS.sms.tencentRegion,
    value: 'ap-guangzhou',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '腾讯云短信地域',
  },
  {
    key: CONFIG_KEYS.sms.volcanoAccessKeyId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎 AccessKeyId',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.volcanoSecretAccessKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎 SecretAccessKey',
    secret: true,
  },
  {
    key: CONFIG_KEYS.sms.volcanoSmsAccount,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎短信账号（SmsAccount）',
  },
  {
    key: CONFIG_KEYS.sms.volcanoSignName,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎短信签名',
  },
  {
    key: CONFIG_KEYS.sms.volcanoTemplateId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎短信模板 ID（模板变量需用 ${code}）',
  },
  {
    key: CONFIG_KEYS.sms.volcanoRegion,
    value: 'cn-north-1',
    type: ConfigValueType.String,
    group: ConfigGroup.Sms,
    remark: '火山引擎地域',
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
  {
    key: CONFIG_KEYS.wallet.paymentProvider,
    value: WALLET_DEFAULTS.paymentProvider,
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '默认充值渠道：alipay / wechat',
  },
  {
    key: CONFIG_KEYS.wallet.payoutProvider,
    value: WALLET_DEFAULTS.payoutProvider,
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '默认提现渠道：alipay（wechat 预留）',
  },
  {
    key: CONFIG_KEYS.wallet.minRechargeFen,
    value: String(WALLET_DEFAULTS.minRechargeFen),
    type: ConfigValueType.Number,
    group: ConfigGroup.Wallet,
    remark: '最小充值金额（分）',
  },
  {
    key: CONFIG_KEYS.wallet.minWithdrawFen,
    value: String(WALLET_DEFAULTS.minWithdrawFen),
    type: ConfigValueType.Number,
    group: ConfigGroup.Wallet,
    remark: '最小提现金额（分）',
  },
  {
    key: CONFIG_KEYS.wallet.notifyBaseUrl,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付回调可达的公网基础地址（如 https://api.example.com），用于拼接异步通知 URL',
  },
  {
    key: CONFIG_KEYS.wallet.alipayAppId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝应用 AppId',
  },
  {
    key: CONFIG_KEYS.wallet.alipayPrivateKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝应用私钥（PEM）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.alipayPublicKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝公钥（PEM，用于回调验签）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.alipayGateway,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝网关地址（留空用官方默认生产网关）',
  },
  {
    key: CONFIG_KEYS.wallet.wechatAppId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付绑定的 AppId',
  },
  {
    key: CONFIG_KEYS.wallet.wechatMchId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付商户号',
  },
  {
    key: CONFIG_KEYS.wallet.wechatSerialNo,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付商户证书序列号',
  },
  {
    key: CONFIG_KEYS.wallet.wechatPrivateKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付商户私钥（PEM）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.wechatApiV3Key,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付 APIv3 密钥（回调报文解密）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.wechatPlatformPublicKey,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付平台证书公钥（PEM，用于回调验签）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.wechatPlatformSerialNo,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '微信支付平台证书序列号（回调验签匹配）',
  },
];

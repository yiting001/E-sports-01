/** 配置项的值类型，读取时按此做反序列化 */
export enum ConfigValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Json = 'json',
  /** 富文本：值为 HTML 字符串，编辑时用富文本编辑器，读取与 string 一致 */
  RichText = 'richtext',
  /** 图片：值为上传后可访问的 URL，编辑时用图片上传控件，读取与 string 一致 */
  Image = 'image',
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
  Sms = 'sms',
  Observability = 'observability',
  Wallet = 'wallet',
  Realname = 'realname',
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

/** 平台品牌信息（公开，登录前即可读取） */
export interface BrandingView {
  /** 软件名称 */
  appName: string;
  /** 软件图标 URL，未配置则为空串 */
  appLogo: string;
}

/** 软件名称默认值（未在配置中心设置时回退使用） */
export const DEFAULT_APP_NAME = '基础设施平台';

/**
 * 全平台配置键常量。
 * 任何模块需要可配置参数时都应在此登记，杜绝散落的硬编码。
 */
export const CONFIG_KEYS = {
  system: {
    /** 软件名称（显示在浏览器标题、登录页、侧边栏等） */
    appName: 'system.appName',
    /** 软件图标 URL（上传图片后保存其访问地址，作 logo 与 favicon） */
    appLogo: 'system.appLogo',
  },
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
  sms: {
    /** 当前生效的短信服务商：aliyun / tencent / volcano / log */
    provider: 'sms.provider',
    /** 验证码位数 */
    codeLength: 'sms.code.length',
    /** 验证码有效期（秒） */
    codeTtl: 'sms.code.ttl',
    /** 同一手机号两次发送的最小间隔（秒），用于发送限流 */
    sendInterval: 'sms.code.sendInterval',
    /** 国际区号（E.164），腾讯云等需要带区号的服务商使用 */
    countryCode: 'sms.countryCode',
    /** 阿里云 */
    aliyunAccessKeyId: 'sms.aliyun.accessKeyId',
    aliyunAccessKeySecret: 'sms.aliyun.accessKeySecret',
    aliyunSignName: 'sms.aliyun.signName',
    aliyunTemplateCode: 'sms.aliyun.templateCode',
    aliyunEndpoint: 'sms.aliyun.endpoint',
    /** 腾讯云 */
    tencentSecretId: 'sms.tencent.secretId',
    tencentSecretKey: 'sms.tencent.secretKey',
    tencentSdkAppId: 'sms.tencent.sdkAppId',
    tencentSignName: 'sms.tencent.signName',
    tencentTemplateId: 'sms.tencent.templateId',
    tencentRegion: 'sms.tencent.region',
    /** 火山引擎 */
    volcanoAccessKeyId: 'sms.volcano.accessKeyId',
    volcanoSecretAccessKey: 'sms.volcano.secretAccessKey',
    volcanoSmsAccount: 'sms.volcano.smsAccount',
    volcanoSignName: 'sms.volcano.signName',
    volcanoTemplateId: 'sms.volcano.templateId',
    volcanoRegion: 'sms.volcano.region',
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
  wallet: {
    /** 当前生效的充值渠道：alipay / wechat */
    paymentProvider: 'wallet.payment.provider',
    /** 当前生效的提现渠道：alipay（wechat 预留） */
    payoutProvider: 'wallet.payout.provider',
    /** 最小充值金额（分） */
    minRechargeFen: 'wallet.minRechargeFen',
    /** 最小提现金额（分） */
    minWithdrawFen: 'wallet.minWithdrawFen',
    /** 支付回调可达的公网基础地址，用于拼接异步通知 URL，例如 https://api.example.com */
    notifyBaseUrl: 'wallet.notifyBaseUrl',
    /** 支付宝 */
    alipayAppId: 'wallet.alipay.appId',
    alipayPrivateKey: 'wallet.alipay.privateKey',
    alipayPublicKey: 'wallet.alipay.publicKey',
    alipayGateway: 'wallet.alipay.gateway',
    /** 微信支付 v3 */
    wechatAppId: 'wallet.wechat.appId',
    wechatMchId: 'wallet.wechat.mchId',
    wechatSerialNo: 'wallet.wechat.serialNo',
    wechatPrivateKey: 'wallet.wechat.privateKey',
    wechatApiV3Key: 'wallet.wechat.apiV3Key',
    /** 微信支付平台证书公钥（PEM），用于回调验签 */
    wechatPlatformPublicKey: 'wallet.wechat.platformPublicKey',
    /** 微信支付平台证书序列号，用于回调验签匹配 */
    wechatPlatformSerialNo: 'wallet.wechat.platformSerialNo',
  },
} as const;

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
  /** 打手（等级档位/押金/实名前置） */
  Booster = 'booster',
  /** 用户会员等级（档位/折扣） */
  Member = 'member',
  /** 运营展示位（首页横幅等） */
  Portal = 'portal',
  /** 邀请奖励（邀请人/被邀请人奖励方式与额度） */
  Invite = 'invite',
  /** 订单（自动派单等策略） */
  Order = 'order',
  /** 通知（微信小程序/公众号推送与语音播报开关） */
  Notify = 'notify',
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

/** C 端门户开关配置（公开，登录前即可读取） */
export interface PortalConfigView {
  /** 是否展示排行榜入口与排行榜页 */
  showRank: boolean;
  /** 是否在 C 端加载 vConsole 调试面板 */
  vConsoleEnabled: boolean;
  /** 是否启用浏览器语音播报（新订单、新消息，C 端与管理端共用开关） */
  voiceNotifyEnabled: boolean;
  /** 是否开启手机号验证码登录/注册（关闭后登录页隐藏短信表单，仅保留已开启的其他登录方式） */
  smsLoginEnabled: boolean;
  /** 是否开启微信公众号网页授权登录（微信内浏览器登录页展示一键登录入口） */
  wechatOfficialLoginEnabled: boolean;
  /** 是否开启微信公众号 JSAPI 支付（微信内浏览器直接拉起收银台） */
  wechatJsapiPayEnabled: boolean;
}

/** 微信支付证书文件的用途：商户证书（含私钥）或平台证书/公钥（回调验签） */
export enum WechatPayCertUsage {
  /** 商户 API 证书：私钥 + 商户证书序列号（apiclient_key.pem / apiclient_cert.p12） */
  Merchant = 'merchant',
  /** 平台证书或平台公钥：回调验签公钥 + 序列号 */
  Platform = 'platform',
}

/** 微信支付证书文件上传解析结果（不回传私钥/公钥正文） */
export interface WechatPayCertUploadResult {
  usage: WechatPayCertUsage;
  /** 本次写入配置中心的配置键列表 */
  updatedKeys: string[];
  /** 从证书解析出的序列号；纯私钥/公钥文件无法解析时为空串 */
  serialNo: string;
}

/** 用户协议（公开，登录前即可读取） */
export interface AgreementView {
  /** 协议正文（富文本 HTML，未配置为空串） */
  contentHtml: string;
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
  portal: {
    /** C 端首页运营横幅 JSON（多图、活动绑定与轮播间隔） */
    homeBanner: 'portal.homeBanner',
    /** C 端是否展示排行榜（个人中心入口与排行榜页） */
    showRank: 'portal.showRank',
    /** C 端是否加载 vConsole 调试面板（默认关闭） */
    vConsoleEnabled: 'portal.vConsoleEnabled',
  },
  auth: {
    accessTokenTtl: 'auth.accessTokenTtl',
    refreshTokenTtl: 'auth.refreshTokenTtl',
    /** 用户协议正文（富文本 HTML，登录/注册页需同意后才可提交） */
    userAgreement: 'auth.userAgreement',
    /** 微信公众号网页授权登录开关（复用 notify.wechat.official.* 公众号凭证） */
    wechatOfficialLoginEnabled: 'auth.wechatOfficialLoginEnabled',
    /** 手机号验证码登录/注册开关（关闭后发码与短信登录注册均拒绝，可与微信登录共存或二选一） */
    smsLoginEnabled: 'auth.smsLoginEnabled',
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
    /** OSS 自定义访问域名（CDN/加速域名，如 https://oss.example.com；留空用 OSS 默认地址） */
    ossPublicBaseUrl: 'upload.oss.publicBaseUrl',
  },
  sms: {
    /** 当前生效的短信服务商：aliyun / tencent / volcano / log */
    provider: 'sms.provider',
    /** 仅 development 生效的固定验证码；清空即关闭，生产环境始终忽略 */
    developmentFixedCode: 'sms.development.fixedCode',
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
  order: {
    /** 支付成功后自动下发接单大厅（夜间无人值守时开启；指定打手订单不受影响） */
    autoDispatchHall: 'order.autoDispatchHall',
  },
  invite: {
    /** 邀请人奖励方式：none / coupon / wallet */
    inviterRewardType: 'invite.inviter.rewardType',
    /** 邀请人奖励优惠券模板 id */
    inviterCouponId: 'invite.inviter.couponId',
    /** 邀请人奖励钱包入账金额（分） */
    inviterAmountFen: 'invite.inviter.amountFen',
    /** 被邀请人奖励方式：none / coupon / wallet */
    inviteeRewardType: 'invite.invitee.rewardType',
    /** 被邀请人奖励优惠券模板 id */
    inviteeCouponId: 'invite.invitee.couponId',
    /** 被邀请人奖励钱包入账金额（分） */
    inviteeAmountFen: 'invite.invitee.amountFen',
    /** 邀请规则说明（富文本 HTML，C 端邀请页展示） */
    rules: 'invite.rules',
  },
  wallet: {
    /** 当前生效的充值渠道：alipay / wechat */
    paymentProvider: 'wallet.payment.provider',
    /** 当前生效的默认提现渠道：alipay / wechat */
    payoutProvider: 'wallet.payout.provider',
    /** 提现（付款）网关：official 官方直连 / jqf 计全付转账（开启后支付宝与微信零钱提现均走计全付 api/transferOrder） */
    payoutGateway: 'wallet.payout.gateway',
    /** 最小充值金额（分） */
    minRechargeFen: 'wallet.minRechargeFen',
    /** 最小提现金额（分） */
    minWithdrawFen: 'wallet.minWithdrawFen',
    /** 提现手续费率（万分比，如 100 = 1%；0 表示免手续费） */
    withdrawFeeRateBp: 'wallet.withdrawFeeRateBp',
    /** 阶梯税费配置（JSON 数组 [{"minFen":0,"rateBp":100},...]，按提现金额选档；空则用单一费率） */
    withdrawTaxTiers: 'wallet.withdrawTaxTiers',
    /** 支付回调可达的公网基础地址，用于拼接异步通知 URL，例如 https://api.example.com */
    notifyBaseUrl: 'wallet.notifyBaseUrl',
    /** 支付宝 */
    alipayAppId: 'wallet.alipay.appId',
    alipayPrivateKey: 'wallet.alipay.privateKey',
    alipayPublicKey: 'wallet.alipay.publicKey',
    alipayGateway: 'wallet.alipay.gateway',
    /** 支付宝证书模式：应用公钥证书（PEM，appCertPublicKey_xxx.crt 内容） */
    alipayAppCert: 'wallet.alipay.appCert',
    /** 支付宝证书模式：支付宝公钥证书（PEM，alipayCertPublicKey_RSA2.crt 内容） */
    alipayPublicCert: 'wallet.alipay.publicCert',
    /** 支付宝证书模式：支付宝根证书（PEM，alipayRootCert.crt 内容） */
    alipayRootCert: 'wallet.alipay.rootCert',
    /** 支付宝转账场景名称（商家平台-资金管理-转账场景 中声明，如「业务结算」） */
    alipayTransferSceneName: 'wallet.alipay.transferSceneName',
    /** 支付宝转账场景报备信息类型（固定值，如「结算款项名称」） */
    alipayTransferReportInfoType: 'wallet.alipay.transferReportInfoType',
    /** 支付宝转账场景报备信息内容（按实际业务填写，如「游戏账号租赁结算款」） */
    alipayTransferReportInfoContent: 'wallet.alipay.transferReportInfoContent',
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
    /** 微信公众号 JSAPI 支付开关（微信内浏览器拉起收银台，关闭时微信内也回退扫码） */
    wechatJsapiEnabled: 'wallet.wechat.jsapiEnabled',

    /** 微信支付网关：official 官方直连 / jqf 计全付（开启后微信扫码与 JSAPI 均走计全付） */
    paymentWechatGateway: 'wallet.payment.wechatGateway',
    /** 支付宝支付网关：official 官方直连 / jqf 计全付（开启后支付宝扫码支付与对应退款均走计全付 ALI_QR） */
    paymentAlipayGateway: 'wallet.payment.alipayGateway',

    /** 计全付网关地址（如 https://pay.example.com，末尾不带 /） */
    jqfApiBase: 'wallet.jqf.apiBase',
    /** 计全付商户号 mchNo */
    jqfMchNo: 'wallet.jqf.mchNo',
    /** 计全付应用 appId */
    jqfAppId: 'wallet.jqf.appId',
    /** 计全付接口私钥 apiKey（密文保存，用于请求签名与回调验签） */
    jqfApiKey: 'wallet.jqf.apiKey',
  },
  booster: {
    /** 打手等级档位（JSON 数组：等级/名称/完成单数门槛/提成万分比） */
    levels: 'booster.levels',
    /** 打手押金最低交付额（分，接单门槛） */
    depositMinFen: 'booster.depositMinFen',
    /** 打手押金最高交付额（分，缴纳上限） */
    depositMaxFen: 'booster.depositMaxFen',
    /** 提交入驻申请是否要求已通过实名认证 */
    requireRealname: 'booster.requireRealname',
    /** C 端打手入驻页顶部公告图片 */
    onboardingNoticeImage: 'booster.onboardingNoticeImage',
    /** C 端打手入驻页公告文本（换行分行展示，与主页公告独立） */
    onboardingNoticeText: 'booster.onboardingNoticeText',
    /** 接单区服选项（JSON 数组：value/label），由管理端打手管理页可视化维护 */
    serviceRegionOptions: 'booster.serviceRegionOptions',
  },
  member: {
    /** 会员等级档位（JSON 数组：等级/名称/累计消费门槛/折扣万分比） */
    levels: 'member.levels',
  },
  notify: {
    /** C 端/管理端是否启用浏览器语音播报（新订单、新消息） */
    voiceEnabled: 'notify.voice.enabled',
    /** 是否启用微信通知（小程序订阅消息/公众号模板消息总开关） */
    wechatEnabled: 'notify.wechat.enabled',
    /** 微信小程序 AppID */
    miniAppId: 'notify.wechat.mini.appId',
    /** 微信小程序 AppSecret */
    miniAppSecret: 'notify.wechat.mini.appSecret',
    /** 小程序「新订单」订阅消息模板 ID（打手侧接单大厅新单） */
    miniOrderTemplateId: 'notify.wechat.mini.orderTemplateId',
    /** 小程序订阅消息点击跳转页面路径 */
    miniOrderPage: 'notify.wechat.mini.orderPage',
    /** 小程序模板字段映射（JSON：{"character_string1":"orderNo",...}，值取订单通知逻辑字段名） */
    miniOrderFields: 'notify.wechat.mini.orderFields',
    /** 微信公众号（订阅号/服务号）AppID */
    officialAppId: 'notify.wechat.official.appId',
    /** 微信公众号 AppSecret */
    officialAppSecret: 'notify.wechat.official.appSecret',
    /** 公众号「新订单」模板消息模板 ID */
    officialOrderTemplateId: 'notify.wechat.official.orderTemplateId',
    /** 公众号模板消息点击跳转链接 */
    officialOrderUrl: 'notify.wechat.official.orderUrl',
    /** 公众号模板字段映射（JSON：{"keyword1":"orderNo",...}，值取订单通知逻辑字段名） */
    officialOrderFields: 'notify.wechat.official.orderFields',
  },
} as const;

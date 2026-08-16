import {
  CONFIG_KEYS,
  ConfigGroup,
  ConfigValueType,
  DEFAULT_APP_NAME,
  InviteRewardType,
  LogLevel,
  PORTAL_BANNER_LIMITS,
  StorageDriver,
  WALLET_DEFAULTS,
  REALNAME_REQUIRED_ROLES_KEY,
} from '@app/contracts';
import { SMS_DEFAULT_CONFIGS } from './sms-config-defaults';

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
 * - upload.localBaseUrl：由固定本机端口改为同源路径，兼容反向代理和容器端口映射。
 * - im.service.welcome：由 string 改为 richtext（仅纠正类型，保留已编辑的欢迎语内容）。
 * - portal.homeBanner：由 image 改为 json（仅纠正类型，读取用例兼容历史图片 URL）。
 */
export const CONFIG_MIGRATIONS: ConfigMigration[] = [
  {
    key: CONFIG_KEYS.upload.maxFileSize,
    legacyValue: String(10 * 1024 * 1024),
    newValue: '10',
  },
  {
    key: CONFIG_KEYS.upload.localBaseUrl,
    legacyValue: 'http://127.0.0.1:3000/static',
    newValue: '/static',
  },
  {
    key: CONFIG_KEYS.im.serviceWelcome,
    expectedType: ConfigValueType.RichText,
  },
  {
    key: CONFIG_KEYS.portal.homeBanner,
    expectedType: ConfigValueType.Json,
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
    key: CONFIG_KEYS.portal.homeBanner,
    value: JSON.stringify({
      items: [],
      intervalSeconds: PORTAL_BANNER_LIMITS.defaultIntervalSeconds,
    }),
    type: ConfigValueType.Json,
    group: ConfigGroup.Portal,
    remark: 'C 端首页运营横幅（多图、活动绑定与轮播间隔，在「运营通知」页维护）',
  },
  {
    key: CONFIG_KEYS.portal.showRank,
    value: 'true',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Portal,
    remark: 'C 端是否展示排行榜（个人中心入口与排行榜页），关闭后隐藏',
  },
  {
    key: CONFIG_KEYS.portal.vConsoleEnabled,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Portal,
    remark: 'C 端是否加载 vConsole 调试面板（全体访客可见，刷新后生效，默认关闭）',
  },
  {
    key: CONFIG_KEYS.booster.onboardingNoticeImage,
    value: '',
    type: ConfigValueType.Image,
    group: ConfigGroup.Booster,
    remark: 'C 端打手入驻公告图片（在配置中心「打手」分组维护）',
  },
  {
    key: CONFIG_KEYS.booster.onboardingNoticeText,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Booster,
    remark: 'C 端打手入驻公告文本（换行分行展示，与主页公告独立）',
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
    key: CONFIG_KEYS.auth.userAgreement,
    value: '',
    type: ConfigValueType.RichText,
    group: ConfigGroup.Auth,
    remark: '用户协议正文（富文本，C 端登录/注册页需勾选同意后才可提交）',
  },
  {
    key: CONFIG_KEYS.auth.wechatOfficialLoginEnabled,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Auth,
    remark: '微信公众号网页授权登录开关：开启后微信内浏览器登录页展示一键登录（需先配置 notify.wechat.official.* 公众号凭证）',
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
    value: '/static',
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
    key: CONFIG_KEYS.upload.ossPublicBaseUrl,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Upload,
    remark: 'OSS 自定义访问域名（CDN/加速域名，如 https://oss.example.com；留空用 OSS 默认地址）',
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
  ...SMS_DEFAULT_CONFIGS,
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
    key: CONFIG_KEYS.invite.inviterRewardType,
    value: InviteRewardType.None,
    type: ConfigValueType.String,
    group: ConfigGroup.Invite,
    remark: '邀请人奖励方式：none / coupon / wallet',
  },
  {
    key: CONFIG_KEYS.invite.inviterCouponId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Invite,
    remark: '邀请人奖励优惠券模板 id（奖励方式为 coupon 时生效）',
  },
  {
    key: CONFIG_KEYS.invite.inviterAmountFen,
    value: '0',
    type: ConfigValueType.Number,
    group: ConfigGroup.Invite,
    remark: '邀请人奖励钱包入账金额（分，奖励方式为 wallet 时生效）',
  },
  {
    key: CONFIG_KEYS.invite.inviteeRewardType,
    value: InviteRewardType.None,
    type: ConfigValueType.String,
    group: ConfigGroup.Invite,
    remark: '被邀请人奖励方式：none / coupon / wallet',
  },
  {
    key: CONFIG_KEYS.invite.inviteeCouponId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Invite,
    remark: '被邀请人奖励优惠券模板 id（奖励方式为 coupon 时生效）',
  },
  {
    key: CONFIG_KEYS.invite.inviteeAmountFen,
    value: '0',
    type: ConfigValueType.Number,
    group: ConfigGroup.Invite,
    remark: '被邀请人奖励钱包入账金额（分，奖励方式为 wallet 时生效）',
  },
  {
    key: CONFIG_KEYS.invite.rules,
    value: '',
    type: ConfigValueType.RichText,
    group: ConfigGroup.Invite,
    remark: '邀请规则说明（富文本，C 端邀请页展示，空则不展示）',
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
    key: CONFIG_KEYS.wallet.withdrawFeeRateBp,
    value: String(WALLET_DEFAULTS.withdrawFeeRateBp),
    type: ConfigValueType.Number,
    group: ConfigGroup.Wallet,
    remark: '提现手续费率（万分比，如 100 = 1%；0 表示免手续费），从提现金额中扣除',
  },
  {
    key: CONFIG_KEYS.wallet.withdrawTaxTiers,
    value: '[]',
    type: ConfigValueType.Json,
    group: ConfigGroup.Wallet,
    remark:
      '阶梯税费配置：JSON 数组 [{"minFen":0,"rateBp":100},{"minFen":100000,"rateBp":300}]，按提现金额取「minFen ≤ 金额」的最高档费率（万分比）；空数组回退单一费率 wallet.withdrawFeeRateBp',
  },
  {
    key: CONFIG_KEYS.order.autoDispatchHall,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Order,
    remark:
      '支付成功后自动下发接单大厅（夜间无人值守时开启，白天关闭改为客服手动下派；指定打手订单不受影响）',
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
    key: CONFIG_KEYS.wallet.alipayAppCert,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝证书模式：应用公钥证书 appCertPublicKey_xxx.crt 内容（三证齐全即启用证书模式）',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.alipayPublicCert,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝证书模式：支付宝公钥证书 alipayCertPublicKey_RSA2.crt 内容',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.alipayRootCert,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝证书模式：支付宝根证书 alipayRootCert.crt 内容',
    secret: true,
  },
  {
    key: CONFIG_KEYS.wallet.alipayTransferSceneName,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark:
      '支付宝转账场景名称（商家平台-资金管理-转账场景 中声明的场景，如「业务结算」；留空则不传报备参数）',
  },
  {
    key: CONFIG_KEYS.wallet.alipayTransferReportInfoType,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝转账场景报备信息类型（固定值，随所选转账场景而定，如「结算款项名称」）',
  },
  {
    key: CONFIG_KEYS.wallet.alipayTransferReportInfoContent,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Wallet,
    remark: '支付宝转账场景报备信息内容（按实际业务填写，如「游戏账号租赁结算款」）',
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
  {
    key: CONFIG_KEYS.wallet.wechatJsapiEnabled,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Wallet,
    remark: '微信公众号 JSAPI 支付开关：开启后微信内浏览器直接拉起收银台（需微信登录绑定 openid），关闭时微信内也回退 Native 扫码',
  },
  {
    key: REALNAME_REQUIRED_ROLES_KEY,
    value: '[]',
    type: ConfigValueType.Json,
    group: ConfigGroup.Realname,
    remark: '需实名认证的角色 code 集合（建议在「实名管理」页维护）',
  },
  {
    key: CONFIG_KEYS.notify.voiceEnabled,
    value: 'true',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Notify,
    remark: '浏览器语音播报开关：C 端打手新单/新消息、管理端新订单/新消息（刷新后生效）',
  },
  {
    key: CONFIG_KEYS.notify.wechatEnabled,
    value: 'false',
    type: ConfigValueType.Boolean,
    group: ConfigGroup.Notify,
    remark: '微信通知总开关（小程序订阅消息/公众号模板消息；需先补全下方凭证与模板）',
  },
  {
    key: CONFIG_KEYS.notify.miniAppId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '微信小程序 AppID（打手订阅消息通知）',
  },
  {
    key: CONFIG_KEYS.notify.miniAppSecret,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '微信小程序 AppSecret',
    secret: true,
  },
  {
    key: CONFIG_KEYS.notify.miniOrderTemplateId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '小程序「新订单」订阅消息模板 ID（在小程序后台订阅消息中申请）',
  },
  {
    key: CONFIG_KEYS.notify.miniOrderPage,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '小程序订阅消息点击跳转页面路径（如 pages/hall/index，留空不跳转）',
  },
  {
    key: CONFIG_KEYS.notify.miniOrderFields,
    value: '{}',
    type: ConfigValueType.Json,
    group: ConfigGroup.Notify,
    remark:
      '小程序模板字段映射 JSON：键为模板字段名（如 character_string1），值为 title/orderNo/product/amount/time/remark',
  },
  {
    key: CONFIG_KEYS.notify.officialAppId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '微信公众号 AppID（订阅号/服务号模板消息通知）',
  },
  {
    key: CONFIG_KEYS.notify.officialAppSecret,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '微信公众号 AppSecret',
    secret: true,
  },
  {
    key: CONFIG_KEYS.notify.officialOrderTemplateId,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '公众号「新订单」模板消息模板 ID',
  },
  {
    key: CONFIG_KEYS.notify.officialOrderUrl,
    value: '',
    type: ConfigValueType.String,
    group: ConfigGroup.Notify,
    remark: '公众号模板消息点击跳转链接（留空不跳转）',
  },
  {
    key: CONFIG_KEYS.notify.officialOrderFields,
    value: '{}',
    type: ConfigValueType.Json,
    group: ConfigGroup.Notify,
    remark:
      '公众号模板字段映射 JSON：键为模板字段名（如 keyword1），值为 title/orderNo/product/amount/time/remark',
  },
];

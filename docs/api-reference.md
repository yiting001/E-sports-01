# API 参考

全局前缀 `/api`。除支付/充值回调外，租户业务请求还需携带
`X-Tenant-Code: <tenantCode>`；缺省只使用 `default`，不会查询全部租户。除标注 **公开** 外，
所有端点需在请求头携带 `Authorization: Bearer <accessToken>`，并满足对应的权限码。
登录后请求头租户必须与 JWT 租户一致。响应统一包装为 `ApiResponse<T>`：

```jsonc
{ "code": 0, "message": "ok", "data": <T>, "timestamp": 1782447482340 }
```

分页结果统一形如 `{ list, total, page, pageSize }`；分页查询入参 `?page=1&pageSize=10`。

## 认证（公开 / 鉴权）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | 当前租户注册 `{ username, password, nickname?, phone?, tenantCode? }` |
| POST | `/api/auth/login` | 公开 | 当前租户登录 `{ account, password, tenantCode? }`，返回双令牌 |
| POST | `/api/auth/refresh` | 公开 | 当前站点租户与 refresh token 租户一致时换发新双令牌 |
| POST | `/api/auth/sms/code` | 公开 | 当前租户发送登录验证码 `{ phone, tenantCode? }` → `{ cooldown }`；登录注册合一，未注册手机号也可发码，已禁用账号拒绝（`auth.smsLoginEnabled` 关闭时 403） |
| POST | `/api/auth/sms/login` | 公开 | 当前租户短信登录 `{ phone, code, tenantCode? }`，登录注册合一：首登自动注册 member 账号，返回双令牌与 `registered` 首登标记（`auth.smsLoginEnabled` 关闭时 403） |
| GET | `/api/auth/wechat/authorize-url` | 公开 | `?redirectUri=` 生成公众号网页授权地址（开关关闭 403，回跳地址仅限 HTTP(S)） |
| POST | `/api/auth/wechat/login` | 公开 | `{ code, tenantCode? }` 公众号授权码登录，首登自动注册 member，返回双令牌 |
| POST | `/api/auth/wechat/bind` | 登录 | `{ code }` 登录态补绑公众号 openid（JSAPI 支付前置），冲突 409 |
| GET | `/api/auth/wechat/identity` | 登录 | 当前账号微信绑定状态 `{ bound }` |
| GET | `/api/auth/profile` | 登录 | 当前用户 `{ id, username, nickname, avatar, phone, roles[], permissions[], isSuper }` |
| PUT | `/api/auth/profile` | 登录 | 自助更新本人资料 `{ nickname?, avatar?, phone? }`（手机号唯一校验，传空串解绑），返回更新后的 `UserView` |

```jsonc
// POST /api/auth/login  请求（account 可填用户名或已绑定手机号）
{ "account": "admin", "password": "admin123456" }
// data
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```

## RBAC 权限

### 租户（仅平台超管）

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/tenants` | `rbac:tenant:list` |
| POST | `/api/rbac/tenants` | `rbac:tenant:create`；仅创建租户与内置角色，不再同步创建管理员账号 |
| PATCH | `/api/rbac/tenants/:id` | `rbac:tenant:update` |
| DELETE | `/api/rbac/tenants/:id` | `rbac:tenant:remove`；当前统一返回 400，禁止物理删除 |

`DELETE` 当前明确拒绝物理删除租户；请使用 `PATCH` 停用，避免留下无法完整清理的业务数据、文件、缓存和索引。

> 多租户行级隔离设计见 [multi-tenant.md](./multi-tenant.md)。

### 用户

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/users` | `rbac:user:list`；支持 `?keyword&status&roleId` |
| POST | `/api/rbac/users` | `rbac:user:create`；可选 `tenantId`，仅平台超管可指定其他租户 |
| PATCH | `/api/rbac/users/:id` | `rbac:user:update`；可选 `tenantId` 变更所属租户（仅平台超管，迁移时解绑原租户角色） |
| POST | `/api/rbac/users/:id/password/reset` | `rbac:user:update`；body `{ password }`，6-128 位 |
| DELETE | `/api/rbac/users/:id` | `rbac:user:remove` |
| POST | `/api/rbac/users/:id/roles` | `rbac:user:assignRoles` |

### 角色

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/roles` | `rbac:role:list`；可选 `keyword`（名称/编码模糊）、`code`（编码精确）、`kind=builtin\|custom\|deleted`（`deleted` 只看已软删除角色） |
| GET | `/api/rbac/roles/grantable-permissions` | `rbac:role:assignPermissions`；按当前操作者过滤可授予权限 |
| POST | `/api/rbac/roles` | `rbac:role:create`；可选 `tenantId`，仅平台超管可指定其他租户；内置编码可补建，租户内重复返回 409 |
| PATCH | `/api/rbac/roles/:id` | `rbac:role:update` |
| DELETE | `/api/rbac/roles/:id` | `rbac:role:remove`；软删除（标记 `deleted_at`，保留用户绑定与权限关联）；默认租户平台超管角色返回 409，不存在返回 404 |
| POST | `/api/rbac/roles/:id/restore` | `rbac:role:remove`；恢复已软删除角色；未删除/不存在返回 404，同编码角色已重建返回 409 |
| POST | `/api/rbac/roles/:id/permissions` | `rbac:role:assignPermissions` |

### 权限

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/permissions` | `rbac:permission:list` |
| POST | `/api/rbac/permissions` | `rbac:permission:create` |
| PATCH | `/api/rbac/permissions/:id` | `rbac:permission:update` |
| DELETE | `/api/rbac/permissions/:id` | `rbac:permission:remove` |

### 菜单

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/menus/mine` | 登录即可（按用户权限过滤下发，超管全量） |

## 配置中心

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/config/branding` | 公开 | 品牌信息 `{ appName, appLogo }`，登录前可读 |
| GET | `/api/config/portal` | 公开 | 门户开关 `{ showRank, vConsoleEnabled, voiceNotifyEnabled, smsLoginEnabled, wechatOfficialLoginEnabled, wechatJsapiPayEnabled }`，缺失或异常时默认关闭（`showRank`、`voiceNotifyEnabled`、`smsLoginEnabled` 默认开启） |
| POST | `/api/config/wechat-pay-cert` | `config:save`（仅超管） | multipart 上传微信支付证书（PEM/P12，`usage=merchant\|platform`，`password?`），解析写入敏感配置项，返回 `{ usage, updatedKeys, serialNo }` |
| GET | `/api/config` | `config:list` | 列表（密钥项值脱敏 `******`） |
| POST | `/api/config` | `config:save` | 新增/更新（upsert）；默认租户非超管返回 403 |
| DELETE | `/api/config/:key` | `config:remove` | 删除并失效缓存；默认租户非超管返回 403 |

```jsonc
// POST /api/config 请求
{ "key": "upload.driver", "value": "oss", "type": "string", "group": "upload", "remark": "存储驱动" }

// 打手入驻公告图：管理员上传图片后保存返回的 URL
{ "key": "booster.onboardingNoticeImage", "value": "/static/2026/07/notice.png",
  "type": "image", "group": "booster", "remark": "C 端打手入驻公告图片", "secret": false }
```

## 文件上传

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/upload` | `upload:file:upload` | multipart 上传，返回元数据 + URL |
| POST | `/api/upload/self` | 登录 | 登录用户自助上传（无需上传权限），供头像、实名证件、打手材料等场景，返回同上 |
| GET | `/api/upload/files` | `upload:file:list` | 分页列表 |
| DELETE | `/api/upload/files/:id` | `upload:file:remove` | 删对象 + 删记录，204 |

静态访问：本地驱动文件经 `upload.localBaseUrl`（默认同源 `/static`）对外提供；独立 API 域名部署时应配置完整 URL。

接口本身不转码；管理端与 C 端 `uploadApi` 在发送前按 contracts `UPLOAD_MEDIA_LIMITS` 压缩图片（长边 ≤ 1920，优先 WebP，文件名扩展名随之变化）并拒绝超过 50 MB 的视频，服务端 `upload.maxFileSize` 仍为最终兜底，见 [upload.md](./upload.md#前端媒体预处理图片压缩--视频限制)。

## WebSocket IM

REST：

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/im/messages` | `im:message:history` | 拉取会话历史（`?conversationId=`，条数默认 `im.historyLimit`） |

WebSocket（命名空间 `/im`，握手携带 access 令牌）：

| 事件 | 方向 | 载荷 |
| --- | --- | --- |
| `im:join` | C→S | `conversationId: string` → 返回 `ChatMessage[]` |
| `im:joined` | S→C | `{ conversationId }` |
| `im:send` | C→S | `{ conversationId, type, content }` |
| `im:receive` | S→C | `ChatMessage` |
| `im:mark-read` | C→S | `{ conversationId, messageId }` → ACK `boolean` |
| `im:conversation` | S→C | `ConversationView`，含单调 `version` 的个人会话新增/变更信号 |
| `im:unread:changed` | S→C | `null`，个人未读变化刷新信号，不含消息正文 |
| `im:error` | S→C | `{ message }` |

## Observability 日志

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/observability/logs` | `observability:log:list` | 分页查询，`?page&pageSize&level&type&traceId&path&userId&startTime&endTime` |
| GET | `/api/observability/logs/trace/:traceId` | `observability:log:detail` | 按 traceId 还原全链路日志 |
| DELETE | `/api/observability/logs` | `observability:log:purge` | 清理过期日志，body `{ days? }`（缺省取 `log.retentionDays`） |

所有响应均带 `x-trace-id` 头，可用于到日志中检索本次请求全链路。

## 钱包

个人侧端点仅需登录态（全员可用，与「我的实名」一致）；管理侧端点纳入 RBAC 权限树（默认仅超管拥有，其他角色按需分配）；回调端点公开（靠验签）。金额一律以「分」整数传输。

### 个人侧（我的钱包，登录态）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/wallet/mine` | 登录态 | 当前用户钱包，不存在则自动初始化 → `{ id, balanceFen, balanceYuan, status }` |
| GET | `/api/wallet/stats` | 登录态 | 钱包统计（余额、累计充值/提现、成功笔数） |
| GET | `/api/wallet/transactions` | 登录态 | 分页查询本人收支明细，`?page&pageSize`，按时间倒序；订单余额支付记录类型为 `order_payment` |
| POST | `/api/wallet/recharge` | 登录态 | 发起充值 `{ amountFen, provider, returnUrl? }`（provider: alipay/wechat/wechat_jsapi；returnUrl 为计全付同步跳转地址（发起充值的页面），服务端追加 `payRef=充值单号`，追加后 ≤128 字符）→ `{ orderId, outTradeNo, provider, qrCode, jsapiParams, amountFen, amountYuan }`（JSAPI 时 `jsapiParams` 为微信拉起参数，否则 `null`） |
| GET | `/api/wallet/recharge/:outTradeNo/status` | 登录态 | 充值单状态查询（仍 pending 时向渠道主动查单并幂等入账，仅本人可查）→ `{ outTradeNo, status }` |
| POST | `/api/wallet/recharge/callback/:provider` | 公开 | 支付渠道异步回调（验签后幂等入账），返回渠道要求的原始应答 |
| POST | `/api/wallet/withdrawal` | 登录态 | 发起提现 `{ amountFen, provider, account, accountName }`（provider 仅 alipay；wechat 预留）→ `{ orderId, status, failReason }` |

### 管理侧（钱包管理，RBAC 门控）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/wallet/admin/wallets` | `wallet:admin:list` | 分页查看所有用户钱包（按用户聚合，`?page&pageSize&keyword`，未开通按零值）→ `WalletAdminView[]` |
| GET | `/api/wallet/admin/wallets/:userId/transactions` | `wallet:admin:transaction` | 分页查看指定用户收支明细（用户未开通钱包返回空页） |
| POST | `/api/wallet/admin/wallets/:userId/adjust` | `wallet:admin:adjust` | 人工调整余额 `{ direction, amountFen, remark }`（direction: in 增/out 扣；钱包不存在则懒创建）→ `WalletAdminView` |
| GET | `/api/wallet/admin/tax-config` | `finance:tax:list` | 读取税务配置（提现阶梯税费档位 + 回退单一费率）→ `WithdrawTaxConfigView` |
| PUT | `/api/wallet/admin/tax-config` | `finance:tax:save`（仅平台超管） | 保存阶梯税费档位 `{ tiers: [{ minFen, rateBp }] }`（写入配置中心 `wallet.withdrawTaxTiers`，空数组清空回退单一费率）→ `WithdrawTaxConfigView` |

```jsonc
// POST /api/wallet/recharge  请求
{ "amountFen": 1000, "provider": "alipay", "returnUrl": "https://m.example.com/#/wallet" }
// data（qrCode 由前端渲染成二维码供扫码支付；JSAPI 时 qrCode 为空串、jsapiParams 为拉起参数）
{ "orderId": "...", "outTradeNo": "R1782...", "provider": "alipay", "qrCode": "https://qr.alipay.com/...", "jsapiParams": null, "amountFen": 1000, "amountYuan": "10.00" }
```

> 真实到账需在配置中心（钱包组）填入商户凭证；未配置时下单/转账会如实返回「渠道未配置」。回调地址 `{wallet.notifyBaseUrl}/wallet/recharge/callback/{provider}` 需公网可达。

## 实名认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/realname/mine` | 登录 | 当前用户实名概览 `{ required, status, record }`（required 由其角色是否命中策略决定；record 脱敏） |
| POST | `/api/realname` | 登录 | 提交/重提实名 `{ realName, idCardNo, frontImage, backImage }`（已通过/审核中会拒绝重复提交）→ 脱敏 `RealnameView` |
| GET | `/api/realname` | `realname:list` | 分页审核列表 `?page&pageSize&status`，按提交时间倒序 |
| POST | `/api/realname/:id/review` | `realname:review` | 审核 `{ approve, rejectReason? }`（驳回必填理由；仅待审核记录可审） |
| GET | `/api/realname/policy` | `realname:policy` | 读取需实名的角色集合 `{ requiredRoleCodes }` |
| PUT | `/api/realname/policy` | 平台超管 + `realname:policy` | 设置全局需实名的角色集合 `{ requiredRoleCodes }` |

```jsonc
// POST /api/realname  请求
{ "realName": "张三", "idCardNo": "11010119900307123X",
  "frontImage": "http://.../front.png", "backImage": "http://.../back.png" }
// data（身份证号脱敏，明文经 AES-256-GCM 加密入库）
{ "id": "...", "realName": "张三", "idCardMasked": "110***********123X",
  "status": "pending", "rejectReason": "", "frontImage": "...", "backImage": "..." }
```

> 身份证号以密文存储（密钥首次启动随机生成并存于配置中心 `realname.idCipherKey`，secret），对外一律返回脱敏串。「需实名的角色」存于配置中心 `realname.requiredRoleCodes`（实名组），建议在「实名管理」页维护。

## 打手入驻

个人侧接口仅需登录，申请记录按当前租户和用户隔离；管理侧接口由 RBAC 门控。`none` 只出现在本人概览中，数据库记录状态为 `pending`、`approved` 或 `rejected`。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/booster/mine` | 登录 | 本人概览 `{ status, record, requireRealname, realnameApproved, depositPolicy, onboardingNoticeImage, onboardingNoticeText, serviceRegionOptions }` |
| GET | `/api/booster/funds/mine` | 登录 | 打手「我的资金」只读聚合（押金/余额/冻结/累计与月度结算/已交罚款，金额均为分） |
| PUT | `/api/booster/mine/availability` | 登录且本人已审核通过 | `{ acceptingOrders: boolean }`；幂等切换上线/下线并返回 `BoosterView` |
| POST | `/api/booster` | 登录 | 首次提交或驳回重提完整资料；待审核 / 已通过时重复提交返回 409 |
| GET | `/api/booster/directory` | 登录 | C 端脱敏挑人目录；`?page&pageSize&keyword&gender&serviceRegion` |
| GET | `/api/booster/directory/:userId` | 登录 | C 端打手脱敏主页；跨租户、未审核、禁用或非打手角色均返回 404 |
| PUT | `/api/booster/mine/voice` | 登录且本人已审核通过 | multipart `file` 上传/更换试听语音 |
| DELETE | `/api/booster/mine/voice` | 登录且本人已审核通过 | 清空本人试听语音 |
| GET | `/api/booster` | `booster:list` | 管理端分页列表 `?page&pageSize&status&keyword`；关键词匹配申请姓名、昵称、用户名或注册手机号 |
| POST | `/api/booster/:id/review` | `booster:review` | 审核 `{ approve, rejectReason? }`；仅待审核可操作，通过后授予 `booster` 角色 |
| PUT | `/api/booster/:id` | `booster:update` | 管理端编辑资料；所有字段可选，只更新传入项且不改变审核状态 |
| PUT | `/api/booster/:id/voice` | `booster:update` | 管理端 multipart `file` 上传/更换指定打手试听语音 |
| DELETE | `/api/booster/:id/voice` | `booster:update` | 管理端清空指定打手试听语音 |
| GET | `/api/booster/levels` | 登录 | 等级档位列表 |
| PUT | `/api/booster/levels` | 平台超管 + `booster:level:set` | 保存全局等级档位 `{ tiers }` |
| GET | `/api/booster/regions` | 登录 | 接单区服选项 `[{ value, label }]` |
| PUT | `/api/booster/regions` | 平台超管 + `booster:region:set` | 保存全局区服选项 `{ options }` |
| GET | `/api/booster/deposit/policy` | 登录 | 押金策略 `{ minFen, maxFen }` |
| PUT | `/api/booster/deposit/policy` | 平台超管 + `booster:deposit:policy:set` | 保存全局押金策略 `{ minFen, maxFen }` |
| POST | `/api/booster/deposit/pay` | 登录 | 已入驻打手从钱包缴纳 `{ amountFen }` |
| POST | `/api/booster/:id/deposit/refund` | `booster:deposit:refund` | 管理端全额退还押金 |

```jsonc
// POST /api/booster 请求
{
  "applicantName": "张三",
  "gender": "male",
  "serviceRegions": ["delta-mobile", "delta-pc"],
  "intro": "熟悉手机端和电脑端接单流程",
  "contactType": "wechat",
  "contactValue": "booster_wechat",
  "materialImage": "/static/2026/07/material.png",
  "invitationCode": "INVITE01"
}

// GET /api/booster/mine 的 data（未申请时 record 为 null）
{
  "status": "pending",
  "record": {
    "id": "...",
    "applicantName": "张三",
    "status": "pending",
    "acceptingOrders": false
  },
  "requireRealname": true,
  "realnameApproved": true,
  "depositPolicy": { "minFen": 10000, "maxFen": 100000 },
  "onboardingNoticeImage": "/static/2026/07/notice.png",
  "onboardingNoticeText": "入驻须完成实名\n缴纳押金后方可接单"
}
```

字段约束：姓名 1～64；性别 `male/female`；区服须从 `delta-mobile/delta-pc` 中选择 1～2 个且不重复；简介 3～500；联系方式类型 `phone/wechat/qq`，内容 1～128；材料图为空串或 `/`、HTTP(S) URL，最长 2048；邀请码选填，最长 64。试听语音最大 5 MB，仅支持 MP3、M4A、WAV、WebM，服务端同时校验声明 MIME 与文件头并规范化扩展名。邀请码不触发邀请绑定或奖励。

> 姓名、联系方式和邀请码当前明文存储，只在本人接口及有权限的管理接口返回；目录/主页仅返回安全显示名、头像、区服、等级、完成单数、语音 URL、接单状态和可选结果。`online` 映射打手本人持久化的 `acceptingOrders`；下线时不能被选择、列为后台候选、指派或接单，`selectable` 仍不是授权凭据。公告图没有公开配置端点，而是随登录后的本人概览下发。详细状态、migration 和安全边界见 [booster.md](./booster.md)。

```jsonc
// GET /api/booster/directory?keyword=一霆&serviceRegion=delta-mobile 的 data.list 项
{
  "userId": "11111111-1111-4111-8111-111111111111",
  "displayName": "一霆",
  "avatar": "/static/avatar.png",
  "gender": "male",
  "serviceRegions": ["delta-mobile"],
  "intro": "熟悉手机端接单",
  "completedOrders": 12,
  "level": 1,
  "levelName": "新秀",
  "voiceUrl": "/static/voice.mp3",
  "online": true,
  "selectable": true,
  "unavailableReason": ""
}
```

## 会员等级与邀请奖励

这两类规则保存在平台全局配置中，读取按原接口权限执行，写入只能由平台超级管理员调用。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/member/levels` | 登录 | 读取会员等级档位 |
| PUT | `/api/member/levels` | 平台超管 + `member:level:set` | 保存全局会员等级档位 `{ tiers }` |
| GET | `/api/invite/admin/config` | `invite:config:set` | 读取邀请奖励配置 |
| PUT | `/api/invite/admin/config` | 平台超管 + `invite:config:set` | 保存全局邀请奖励配置 |

## 反馈管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/feedback` | 登录 | 提交投诉反馈：打手投诉 `{ type:'booster', orderId, content }`；客服/其他 `{ type, target?, content }`。服务端校验本人订单并固化实际打手快照 → `FeedbackView` |
| GET | `/api/feedback/mine` | 登录 | 分页查询我的反馈 `?page&pageSize`，按提交时间倒序 |
| GET | `/api/feedback` | `feedback:list` | 管理端分页列表 `?page&pageSize&status&type`，按提交时间倒序 |
| POST | `/api/feedback/:id/handle` | `feedback:handle` | 普通处理 `{ replyContent }`；锁行执行 `pending -> resolved` |
| POST | `/api/feedback/:id/penalty` | `feedback:handle` + `finance:penalty:create` | 对结构化订单的实际打手直接扣款 `{ amountFen, source, reason, replyContent }`；来源为 `balance/deposit`，同反馈幂等并同步完成回复 |

```jsonc
// POST /api/feedback  请求（订单与实际打手由服务端复核）
{ "type": "booster", "orderId": "11111111-1111-4111-8111-111111111111", "content": "态度恶劣，拒绝沟通" }
// data（节选；完整结构见 packages/contracts 的 FeedbackView）
{ "id": "...", "type": "booster", "target": "O202607210001",
  "orderId": "11111111-1111-4111-8111-111111111111", "orderNo": "O202607210001",
  "boosterUserId": "22222222-2222-4222-8222-222222222222", "boosterName": "打手小王",
  "penaltyId": "", "content": "...", "status": "pending", "replyContent": "",
  "handledBy": "", "handledAt": "" }

// POST /api/feedback/:id/penalty 请求
{ "amountFen": 1000, "source": "balance", "reason": "服务态度不符合要求",
  "replyContent": "投诉已核实，平台已完成扣款处理。" }
```

## 运营通知与首页横幅

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notice/banner` | 公开 | 首页横幅 `{ items: [{ image, activityId }], intervalSeconds }`；空数组时不展示 |
| PUT | `/api/notice/banner` | `notice:banner` | 保存完整横幅配置；最多 10 张、间隔 1～3 秒，`items: []` 撤下全部 |
| GET | `/api/notice/public` | 公开 | 启用中的通知列表（sort 升序 + 创建时间倒序） |
| GET | `/api/notice/popup` | 公开租户接口 | 当前租户最新一条弹窗公告，无则 `null`；租户由 `X-Tenant-Code` 指定 |
| GET | `/api/notice/public/:id` | 公开 | 单条通知详情（仅启用中的可见） |
| GET | `/api/notice` | `notice:list` | 管理端分页列表 `?page&pageSize` |
| POST | `/api/notice` | `notice:save` | 新建通知 `{ title, content, enabled, popup, sort }` → `NoticeView` |
| PUT | `/api/notice/:id` | `notice:save` | 编辑通知 |
| DELETE | `/api/notice/:id` | `notice:remove` | 删除通知 |

## 消息通知（微信绑定）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notify/wechat/mine` | 登录 | 本人微信绑定概览 `{ enabled, bindings: [{ channel, openidMasked, boundAt }] }` |
| POST | `/api/notify/wechat/bind` | 登录 | `{ channel: mini\|official, code }`；服务端凭授权 code 换 openid，重复绑定覆盖 |
| POST | `/api/notify/wechat/unbind` | 登录 | `{ channel }`；幂等解除绑定 |
| GET | `/api/notify/wechat/authorize-url` | 登录 | `?redirectUri=`；生成公众号 snsapi_base 网页授权地址 |

订单微信推送与语音播报的配置项、流程与边界见 [notify.md](./notify.md)。

## 服务订单与下单支付

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/commerce/public/products/:id` | 公开 | 单个上架商品详情（下架/不存在均 404）；`priceFen/originPriceFen` 为手机端价格，`pcPriceFen/pcOriginPriceFen` 为电脑端价格 |
| POST | `/api/order` | 登录 | 创建订单并支付 `{ productId, quantity, provider, gameAccountId, gameTextId?, serviceRegion, boosterSelectionMode, requestedBoosterId?, accountInfo?, remark?, remarkMedia?, userCouponId?, returnUrl? }`；provider 为 `alipay/wechat/wechat_jsapi/balance`；returnUrl 为计全付同步跳转地址，形如 `…/#/orders/{payRef}`（服务端把 `{payRef}` 替换为订单 id，支付后直接回订单详情；无占位符则追加 `payRef`）。渠道支付返回二维码或 JSAPI 拉起参数，余额/0 元支付返回 `paid: true` 并直接落账 |
| POST | `/api/order/pay/callback/:provider` | 公开 | 支付渠道异步回调（验签后幂等落账：待付款 → 待客服处理，并累加销量） |
| GET | `/api/order/mine` | 登录 | 分页查询我的订单 `?page&pageSize&status`（status 可选，tabs 按状态过滤），按创建时间倒序 |
| GET | `/api/order/:id` | 登录 | 我的单笔订单，仅本人可见；已支付但无群时幂等补建订单群 |
| GET | `/api/order/:id/pay/query` | 登录 | 支付渠道主动查单兜底，仅本人可查；已支付空群同步补建 |
| POST | `/api/order/:id/cancel` | 登录 | 取消待付款订单（已支付订单不可取消） |
| POST | `/api/order/:id/refund` | 登录且订单本人 | 已付款未开工订单申请全额退款 `{ reason }`；订单冻结为退款处理中，返回含退款投影的最新订单 |
| GET | `/api/order/hall` / `/api/order/hall/:id` | `booster` 角色 | 大厅列表支持 `?page&pageSize&keyword&serviceRegion`，关键词匹配订单号/商品名，区服为 `delta-mobile` / `delta-pc`；详情接单前隐藏数字 ID、文字 ID 和账号信息 |
| POST | `/api/order/hall/:id/accept` | `booster` 角色且当前上线 | 原子接单；下线拒绝，锁定打手订单只能由锁定人领取，竞争失败返回 409 |
| GET | `/api/order/booster/mine` / `/api/order/booster/mine/:id` | `booster` 角色 | 本人接单订单及详情，接单后可见敏感账号字段 |
| POST | `/api/order/booster/:id/complete` | `booster` 角色 | 完成服务并结算提成 |
| GET | `/api/order/admin` / `/api/order/admin/:id` | `order:admin:list` / `order:admin:detail` | 管理端订单列表/详情，客服按负责商品隔离 |
| POST | `/api/order/admin/:id/group/join` | `order:admin:detail` | 幂等加入订单群并返回 `conversationId` |
| POST | `/api/order/admin/:id/dispatch` | `order:admin:dispatch` | 自动安排订单下发大厅；锁定指定打手订单返回业务错误 |
| GET | `/api/order/admin/booster-candidates` | `order:admin:assign` | 管理端候选打手搜索，仅返回同租户当前上线且资格有效的打手 |
| POST | `/api/order/admin/:id/assign` | `order:admin:assign` | 指派并原子推进服务中；锁定订单禁止改派，竞争失败 409 |
| POST | `/api/order/admin/:id/refund/approve` | `order:admin:refund:review` | 同意退款；处理中时查询渠道，明确失败时使用新渠道尝试号重试；客服仍按负责商品隔离 |
| POST | `/api/order/admin/:id/refund/reject` | `order:admin:refund:review` | 驳回待审核退款 `{ reason }`，恢复申请前履约状态 |

下单约束：`gameAccountId` 为 1～32 位数字；`serviceRegion` 只能为 `delta-mobile` / `delta-pc`，并决定服务端使用手机端还是电脑端商品价格；请求不接收客户端金额。`boosterSelectionMode=specified` 必须提供可选打手 ID。锁定打手在创建、指派/接单时均由服务端复核上线状态、目录可见性、启用状态、booster 角色、区服（历史空区服仅跳过此项）、实名、押金和本人排除。订单群使用订单 UUID 作为确定性会话 ID；首次失败不回滚支付，查单、详情和后台进群会幂等补建。

## 商品评论

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/review/public/product/:productId` | 公开 | 商品可见评论分页 `?page&pageSize`，附带平均分 `avgRating`（评论人昵称脱敏） |
| POST | `/api/review` | 登录 | 对本人已完成订单发表评论 `{ orderId, rating(1-5), content }`，一单一评 |
| GET | `/api/review/mine/reviewed` | 登录 | 给定订单集合中本人已评价的订单 id `?orderIds=a,b` |
| GET | `/api/review` | `review:admin:list` | 管理端分页检索评论 `?page&pageSize&rating&visible` |
| POST | `/api/review/:id/visibility` | `review:admin:moderate` | 隐藏/恢复评论 `{ visible }` |
| DELETE | `/api/review/:id` | `review:admin:remove` | 删除评论（硬删除，删除后该订单可重新评价） |

## 权限码一览（contracts `PERMS`）

| 模块 | 权限码 |
| --- | --- |
| 配置 | `config:list` `config:save` `config:remove` |
| 用户 | `rbac:user:list` `rbac:user:create` `rbac:user:update` `rbac:user:remove` `rbac:user:assignRoles` |
| 角色 | `rbac:role:list` `rbac:role:create` `rbac:role:update` `rbac:role:remove` `rbac:role:assignPermissions` |
| 权限 | `rbac:permission:list` `rbac:permission:create` `rbac:permission:update` `rbac:permission:remove` |
| 文件 | `upload:file:upload` `upload:file:list` `upload:file:remove` |
| IM | `im:message:history` |
| 日志 | `observability:log:list` `observability:log:detail` `observability:log:purge` |
| 钱包管理 | `wallet:admin:list` `wallet:admin:transaction` `wallet:admin:adjust` |
| 财务 | `finance:withdrawal:list` `finance:withdrawal:review` `finance:penalty:list` `finance:penalty:create` |
| 实名 | `realname:list` `realname:review` `realname:policy` |
| 打手 | `booster:list` `booster:review` `booster:update` `booster:level:set` `booster:deposit:refund` `booster:deposit:policy:set` |
| 订单管理 | `order:admin:list` `order:admin:detail` `order:admin:dispatch` `order:admin:assign` `order:admin:refund:review` |
| 反馈 | `feedback:list` `feedback:handle` |
| 评论 | `review:admin:list` `review:admin:moderate` `review:admin:remove` |
| 通知 | `notice:list` `notice:save` `notice:remove` `notice:banner` |

## 业务状态码（`BizCode`）

| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 失败 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 不存在 |
| 500 | 服务器错误 |

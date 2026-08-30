# 支付网关抽象与计全付接入

## 1. 功能目标与非目标

**目标**

- 把「支付方式」（微信扫码 / 微信公众号 JSAPI / 支付宝）与「执行网关」（官方直连 / 计全付聚合）解耦：同一支付方式可在管理端「支付配置」页一键切换网关，业务层（订单、充值、退款）不感知网关差异。
- 接入计全付（jeepay 协议，见仓库根目录 `jqfpay-skill/`）：微信扫码（WX_NATIVE）、微信公众号（WX_JSAPI）下单、查单、异步回调验签、原路退款。
- 支付配置可视化：管理端新增「支付配置」菜单页，平台超管可维护网关开关与计全付凭证（网关地址 / mchNo / appId / apiKey）。

**非目标**

- 计全付当前不支持支付宝，支付宝网关固定官方渠道（配置键 `wallet.payment.alipayGateway` 为预留位）。
- 不涉及提现（付款）渠道切换；不接入计全付钱包 / 转账 / 分账能力。
- 不改动订单 / 充值 / 退款的业务状态机与数据模型（无新增表、无 migration）。

## 2. 目录结构与分层职责

```text
apps/server/src/modules/wallet/
├── application/
│   ├── payment-gateway.service.ts     # 网关路由：官方渠道 → 实际执行渠道（按配置开关）
│   ├── payment.resolver.ts            # 支付渠道策略选择器（已有，复用）
│   └── refund.resolver.ts             # 退款渠道策略选择器（已有，复用）
└── infrastructure/drivers/
    ├── jqf-pay.config.ts              # 计全付凭证装配（配置中心 wallet.jqf.*，缺失拒绝资金请求）
    ├── jqf-pay.request.ts             # MD5 签名/验签、公共参数、HTTP 调用与响应包裹解析
    ├── jqf-pay.trade.ts               # 统一下单/查单/回调解析等交易公共函数
    ├── jqf-wechat-payment.driver.ts   # 计全微信扫码（WX_NATIVE，payDataType=codeUrl）
    ├── jqf-wechat-jsapi-payment.driver.ts # 计全微信公众号（WX_JSAPI，payData 为 JSBridge 拉起参数）
    └── jqf-refund.driver.ts           # 计全原路退款（Native/JSAPI 共用）

apps/web/src/views/finance/PaymentConfigView.vue   # 管理端「支付配置」页
packages/contracts/src/wallet/wallet.ts            # PaymentProvider 新增 jqf_* 渠道、PaymentGateway 枚举
```

设计模式：**策略模式**（`PaymentPort`/`RefundPort` 多驱动注册，Resolver 按渠道挑选）+ **适配器模式**（计全付驱动把 jeepay 协议适配为仓库统一的支付/退款端口）+ **网关路由**（`PaymentGatewayService` 按配置把官方渠道映射为实际执行渠道）。计全付渠道即普通策略成员，后续接入新聚合网关只需新增驱动并在 `PaymentGatewayService` 补映射。

## 3. 模块结构图

```mermaid
flowchart LR
    subgraph 业务用例
        CO[CreateOrderUseCase] --> GW
        QO[QueryOrderPaymentUseCase] --> GW
        CR[CreateRechargeUseCase] --> GW
        AR[ApproveOrderRefundUseCase] --> GW
    end
    GW[PaymentGatewayService<br/>网关路由] --> PR[PaymentResolver / RefundResolver<br/>策略选择器]
    GW -.读取开关.-> CC[(配置中心<br/>wallet.payment.*)]
    PR --> W[官方微信驱动]
    PR --> A[官方支付宝驱动]
    PR --> JW[计全微信驱动<br/>WX_NATIVE / WX_JSAPI]
    PR --> JR[计全退款驱动]
    JW --> JQF[计全付网关<br/>api/pay/*]
    JR --> JQF2[计全付网关<br/>api/refund/*]
    JW -.凭证.-> CFG[JqfPayConfigFactory<br/>wallet.jqf.*]
    JR -.凭证.-> CFG
```

## 4. 支付时序图

```mermaid
sequenceDiagram
    participant C as C 端
    participant O as 订单/充值用例
    participant G as PaymentGatewayService
    participant D as 计全微信驱动
    participant J as 计全付网关

    C->>O: 下单（provider=wechat）
    O->>G: resolvePaymentProvider(wechat)
    G-->>O: jqf_wechat（开关开启时）
    O->>D: createRecharge（金额/单号/notifyUrl 含实际渠道）
    D->>J: api/pay/unifiedOrder（MD5 签名）
    J-->>D: payOrderId + codeUrl / wxapp 拉起参数
    D-->>C: 二维码 / JSBridge 参数
    J->>O: POST /callback/jqf_wechat（异步通知）
    O->>D: parseCallback（MD5 验签，失败直接拒绝）
    D-->>O: outTradeNo/payOrderId/amount/success
    O-->>J: 纯文本 SUCCESS（否则渠道按梯度重试）
```

## 5. 配置项与状态

| 配置键 | 说明 |
| --- | --- |
| `wallet.payment.wechatGateway` | 微信支付网关：`official` 官方直连 / `jqf` 计全付（扫码与 JSAPI 一起切换） |
| `wallet.payment.alipayGateway` | 支付宝网关：当前仅 `official` 生效（`jqf` 预留位） |
| `wallet.jqf.apiBase` | 计全付网关地址（必须 `https://`，末尾不带 `/`） |
| `wallet.jqf.mchNo` / `wallet.jqf.appId` | 计全付商户号与应用 appId |
| `wallet.jqf.apiKey` | 接口私钥（**敏感项密文保存，不回显**；编辑留空表示保持原值） |

- 渠道枚举：`PaymentProvider` 新增 `jqf_wechat` / `jqf_wechat_jsapi`；回调路由 `/wallet/recharge/callback/:provider`、`/order/pay/callback/:provider` 复用现有控制器，按渠道分发驱动。
- 订单支付方式不感知网关：`toOrderPaymentMethod` 把计全渠道回归对应微信支付方式；充值单持久化实际执行渠道，回调/查单不受后续网关切换影响。
- 计全付协议要点：MD5 签名（key ASCII 字典序 + `&key=apiKey` 后取大写 MD5）、金额单位分、`reqTime` 东八区 `yyyyMMddHHmmss`、支付成功 `state=2`、应答 `SUCCESS`。

## 6. 权限与安全边界

- 「支付配置」页挂在财务分组菜单（`finance:payment:menu`）；配置写入走配置中心统一入口，**平台全局配置仅平台超管可改**（租户管理员被 `UpsertConfigUseCase` 拒绝）。
- `apiKey` 标记 `secret`：列表接口返回掩码，编辑留空不清空原值，前端不回显。
- 计全付凭证缺失或网关地址非 HTTPS 时，`JqfPayConfigFactory` 直接拒绝发起任何资金请求（`ServiceUnavailableException`），不带凭证明文的报错提示指引到「支付配置」页。
- 回调验签失败抛 `BadRequestException`，不落账、不回 SUCCESS；日志不记录 apiKey 与回调原文中的敏感字段。

## 7. 异常与失败恢复

- 下单/查单：网关不可达抛 `BadGatewayException`（业务可提示稍后重试）；业务失败（`code!=0`）抛带渠道 msg 的 `BadRequestException`。
- 退款为资金操作，遵循与官方渠道一致的「结果未知不误判」原则：
  - 传输失败 / 响应异常 → `RefundOutcomeUnknownError`，上层保留处理中状态并主动查询；
  - 业务报错先按 `mchRefundNo` 查退款单，已存在以查询结果为准（幂等），确认不存在才判失败；
  - 状态映射：`state=2` 成功 / `state=3` 失败（截取 errMsg ≤255）/ 其余处理中。
- 网关切换风险：查单与退款按「当前」网关配置路由；**切换网关前先处理完在途待支付订单**（充值单已持久化实际渠道，不受影响）。

## 8. 测试与验证

- 单测 `apps/server/test/wallet/jqf-pay.spec.ts`：签名规则（排序/过滤空值/大写 MD5）、验签接受与篡改拒绝、回调成功/未支付映射、东八区时间戳、网关路由（开启计全付微信切换 / 支付宝始终官方 / 官方直通）。
- 既有订单用例单测通过直通网关桩（`test/order/payment-gateway.stub.ts`）聚焦自身逻辑。
- 已运行：`pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm build:server` / `pnpm test` / `git diff --check` 全部通过。

## 9. 尚未实现与后续路线

- 计全付支付宝（渠道方开放后：新增 ALI_* 驱动 + `resolveAlipayGateway` 映射即可）。
- 计全付回调通知的对账任务（当前依赖异步通知 + 用户侧查单兜底，与官方渠道一致）。
- 支付配置页仅平台级；如需租户级网关开关，需把配置键纳入租户覆盖白名单并评估资金归集问题。

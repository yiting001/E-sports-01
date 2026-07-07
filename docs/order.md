# 服务订单模块（order）

用户在 C 端商品详情页下单陪玩/代打服务，扫码支付（支付宝/微信），
支付成功后订单进入「待客服处理」并自动创建订单沟通群（用户 + 商品关联客服 + 平台管理员）；
客服可把订单下发接单大厅或直接指派指定打手，
打手（booster 角色）接单/被指派后自动进群 → 服务 → 完成。

## 实现的功能

- C 端商品详情页：封面/标题/价格/富文本详情，PC 端导航与详情主体同轴收敛，进入结算页选择数量、备注、优惠券与支付方式后下单；结算页复用同类顶部返回栏，基础样式拆分到 `CheckoutView.css`
- 备注附件：下单备注支持上传图片/视频（`RemarkMediaUploader`，复用 `/upload/self` 自助上传，最多 `ORDER_LIMITS.remarkMediaMax` 个），订单固化 `remarkMedia` jsonb 快照，详情页/大厅详情/管理端抽屉以缩略图展示（`RemarkMediaGallery`）
- 账号信息：下单可选填 `accountInfo`（游戏账号等敏感信息）；仅本人、接单后的打手与管理端可见，接单大厅列表/详情经 `toHallOrderView` 置空不下发
- 下单支付：复用钱包模块的支付宝/微信收款驱动（策略模式），返回扫码二维码，前端轮询支付结果
- 会员折扣：下单时按用户当前会员等级折扣（member 模块 `MemberLevelService`）计应付，订单固化 `originalAmountFen`/`discountBp` 快照
- 优惠券抵扣：下单可选用未使用的我的优惠券（coupon 模块 `CouponRedeemService`），在会员折后价上再抵扣（实付至少 1 分），订单固化 `userCouponId`/`couponDeductionFen` 快照；条件核销防并发重复用券，取消订单时自动回滚券为未使用（详见 docs/coupon.md）
- 支付回调：渠道异步回调验签解析，事务 + 行锁内幂等落账（待付款 → 待客服处理），并累加商品销量与用户会员累计消费（`MemberProgressService.recordSpend`）
- 主动查单兜底：支付二维码弹窗轮询 `GET /order/:id/pay/query`，后端调渠道官方查单接口（支付宝 `alipay.trade.query` / 微信 `GET /v3/pay/transactions/out-trade-no`），查到已支付则与回调共用 `OrderPaymentSettleService` 幂等落账——回调丢失/延迟也能正常完成支付流程
- 我的订单：分页列表（商品快照/数量/金额/状态），待付款订单可取消；PC 端标题、紧凑状态筛选、列表统一收敛到内容区宽度，移动端保持全屏滚动
- C 端订单详情页（`/orders/:id`）：点击订单卡片进入，展示商品快照、状态、价格明细（原价/会员折扣减免/优惠券抵扣/实付）、订单信息（订单号/支付方式/时间/备注）；已建群订单提供「进入订单群」入口（跳全屏聊天页 `/chat/:id`），待付款可取消
- 管理端订单管理：分页检索全量订单（状态/订单号过滤）+ 详情抽屉（商品快照/归属用户/关联客服/渠道交易号），
  权限码 `order:admin:list` / `order:admin:detail`，菜单「电竞运营 / 订单管理」由播种器幂等补齐
- 支付渠道配置沿用配置中心既有 `wallet.*` 键（网关地址、商户密钥、回调基址 `wallet.notify.base-url`），无新增配置
- 支付成功自动建群：落账后经 im 模块 `GroupFacade` 自动创建订单群（下单用户 + 商品关联客服 + 平台管理员，客服缺省时管理员兜底为群主），群会话 id 回填订单 `conversationId`；建群失败仅记日志不阻断落账；拉管理员优先租户管理员、无则回退超管，保证后台能看到订单群
- 后台订单群入口：详情抽屉「进入订单群」→ POST `/order/admin/:id/group/join` 幂等加群（客服仅限自己负责的订单）→ 跳转 IM 页并自动选中该群会话（`/im?conversation=xxx`）
- 客服订单可见性：客服角色（非管理员）在管理端订单列表/详情/下发/指派均被强制限定为自己负责商品的订单（`ServiceAgentScope`）；客服角色默认权限已含订单菜单与处理接口
- 下发大厅：管理端「待客服处理」订单可下发接单大厅（权限码 `order:admin:dispatch`），订单进入「待接单」
- 指派打手：客服/管理员可直接指派指定平台打手（权限码 `order:admin:assign`，POST `/order/admin/:id/assign`），「待客服处理/待接单」→「服务中」；被指派人须有打手角色、满足实名要求（`BoosterRealnameGuard`，开关关闭不校验）且押金缴足；候选列表 GET `/order/admin/booster-candidates` 仅返回打手角色用户
- 接单大厅（C 端打手身份）：分页浏览待接单订单，点卡片进入大厅订单详情页（`/hall/:id`，GET `/order/hall/:id`，展示备注与附件、隐藏账号信息，可直接接单）；接单后回填 `boosterId` 并进入「服务中」；不能接自己的单；接单前经 booster 模块 `BoosterRealnameGuard` 校验实名要求（后台开启 `booster.requireRealname` 时须实名已通过，未开启不校验）与 `BoosterDepositGuard` 校验押金已缴足；接单/被指派后打手自动加入订单群并广播系统消息
- 完成结算：打手完成订单时按其当前等级费率（booster 模块 `BoosterProgressService`）计提成经 `WalletLedger` 入账（commission 流水），订单落 `commissionFen`/`commissionRateBp` 快照并累计完成单数
- 打手订单中心（C 端打手身份）：分页查看本人接下的订单（全部/服务中/已完成），服务中可标记完成
- C 端身份切换：拥有 booster 角色的账号可在「我的」页切换老板/打手身份（本地持久化），
  打手身份下一级导航变为「接单大厅/订单中心/消息/我的」；接单接口由后端 `BoosterAccess` 断言角色

## 订单状态机

```
pending_payment（待付款）
   ├─ 支付回调成功 ──▶ pending_service（待客服处理）
   └─ 用户取消 ──────▶ cancelled（已取消）
pending_service（待客服处理）
   ├─ 客服下发大厅 ─▶ dispatching（待接单）
   └─ 客服指派打手 ─▶ serving（服务中）
 dispatching ──┬─ 打手接单 ──▶ serving（服务中）── 打手完成 ──▶ completed（已完成）
               └─ 客服指派打手 ─▶ serving（服务中）
```

## 结构导图

```
packages/contracts/src/order/order.ts        # OrderStatus / CreateOrderPayload / OrderView / ORDER_LIMITS
apps/server/src/modules/order/
├── domain/                                  # 领域层
│   ├── order.entity.ts                      # 订单聚合根（商品快照 + orderNo 幂等键）
│   └── order-repository.interface.ts        # 仓储抽象（含大厅/打手维度分页）
├── infrastructure/
│   └── order.repository.ts                  # TypeORM 实现（租户过滤）
├── application/
│   ├── order.mapper.ts                      # 实体 → 视图
│   ├── booster-access.service.ts            # 打手角色访问断言（复用 RBAC RoleGranter）
│   ├── order-group.service.ts               # 订单群编排（支付成功建群 / 打手进群，失败不阻断主流程）
│   ├── service-agent-scope.service.ts       # 客服可见范围解析（客服仅限自己负责的订单）
│   └── use-cases/
│       ├── create-order.usecase.ts          # 校验在架 → 固化快照 → 渠道下单取二维码
│       ├── handle-order-callback.usecase.ts # 回调验签 → 幂等标记已支付 + 累加销量
│       ├── get-my-order.usecase.ts          # 单笔查询（支付轮询）
│       ├── list-admin-orders.usecase.ts     # 管理端分页检索（状态/订单号过滤）
│       ├── get-admin-order.usecase.ts       # 管理端单笔详情
│       ├── list-my-orders.usecase.ts        # 我的订单分页
│       ├── cancel-my-order.usecase.ts       # 取消待付款订单
│       ├── dispatch-order.usecase.ts        # 客服下发大厅（待客服处理 → 待接单）
│       ├── assign-order-booster.usecase.ts  # 客服指派指定打手（→ 服务中，指派后进群）
│       ├── list-booster-candidates.usecase.ts # 可指派打手候选分页（仅打手角色）
│       ├── join-order-group.usecase.ts      # 管理端幂等加入订单群（返回会话 id）
│       ├── list-hall-orders.usecase.ts      # 接单大厅分页（仅打手，账号信息置空）
│       ├── get-hall-order.usecase.ts        # 接单大厅订单详情（仅打手，账号信息置空）
│       ├── accept-hall-order.usecase.ts     # 打手接单（待接单 → 服务中，回填 boosterId）
│       ├── list-booster-orders.usecase.ts   # 打手订单中心分页（可按状态过滤）
│       └── complete-booster-order.usecase.ts# 打手完成服务（服务中 → 已完成，提成结算入账）
├── interfaces/
│   ├── dto/create-order.dto.ts
│   ├── dto/order-admin-list-query.dto.ts    # 分页 + 状态/订单号过滤
│   ├── dto/assign-order.dto.ts              # 指派打手请求体（boosterId）
│   └── controllers/                         # 一个路由一个文件
│       ├── order.create.controller.ts       # POST /order
│       ├── order.callback.controller.ts     # POST /order/pay/callback/:provider（公开）
│       ├── order.mine.list.controller.ts    # GET  /order/mine
│       ├── order.admin.list.controller.ts   # GET  /order/admin（order:admin:list）
│       ├── order.admin.detail.controller.ts # GET  /order/admin/:id（order:admin:detail）
│       ├── order.admin.dispatch.controller.ts # POST /order/admin/:id/dispatch（order:admin:dispatch）
│       ├── order.admin.assign.controller.ts # POST /order/admin/:id/assign（order:admin:assign）
│       ├── order.admin.group-join.controller.ts # POST /order/admin/:id/group/join（order:admin:detail）
│       ├── order.admin.booster-candidates.controller.ts # GET /order/admin/booster-candidates（order:admin:assign）
│       ├── order.hall.list.controller.ts    # GET  /order/hall（仅打手）
│       ├── order.hall.detail.controller.ts  # GET  /order/hall/:id（仅打手）
│       ├── order.hall.accept.controller.ts  # POST /order/hall/:id/accept（仅打手）
│       ├── order.booster.list.controller.ts # GET  /order/booster/mine（仅打手）
│       ├── order.booster.complete.controller.ts # POST /order/booster/:id/complete（仅打手）
│       ├── order.mine.detail.controller.ts  # GET  /order/:id
│       └── order.cancel.controller.ts       # POST /order/:id/cancel
└── order.module.ts                          # 模块装配（静态路由先于 :id 注册）

复用的既有能力：
- im：GroupFacade（系统建群/幂等进群 + 系统消息 + 会话推送，订单群编排复用）
- rbac：RoleGranter（客服/管理员角色判定）/ UserDirectory（打手候选、平台管理员名录）
- commerce：GET /commerce/public/products/:id（本次新增公开商品详情）+ 商品仓储导出
- wallet：PaymentResolver / PaymentPort 策略（支付宝/微信驱动、验签、应答报文）+ WalletLedger 提成入账
- booster：BoosterDepositGuard（接单押金门控）/ BoosterProgressService（完成单数累计 + 等级费率解析）
- member：MemberLevelService（下单折扣解析）/ MemberProgressService（支付成功累计消费）

apps/client/src/
├── api/order.api.ts                         # 下单/详情/我的订单/取消/大厅/接单/打手订单/完成
├── stores/role.store.ts                     # 身份切换状态（老板/打手，本地持久化）
├── config/nav.ts                            # 老板/打手两套一级导航配置
├── views/product/ProductDetailView.vue      # 商品详情（纯展示，立即下单进下单页）
├── views/product/ProductDetailView.responsive.css # 商品详情 PC 响应式布局
├── views/order/CheckoutView.vue             # 下单页（数量/备注/支付方式 → 扫码支付）
├── views/order/MyOrdersView.vue             # 我的订单页编排（筛选/分页/评价弹层/进详情）
├── views/order/OrderDetailView.vue          # 订单详情页（价格明细/订单信息/订单群入口）
├── views/order/OrderDetailView.css          # 订单详情页样式（移动全屏 + PC 收敛）
├── views/message/ChatView.vue               # 全屏会话聊天页（订单群/群聊/客服复用 ServiceChatPanel）
├── views/order/HallView.vue                 # 接单大厅（打手一级 Tab，接单/点卡片看详情）
├── views/order/HallOrderDetailView.vue      # 大厅订单详情（/hall/:id，含备注附件，可接单）
├── views/order/BoosterOrdersView.vue        # 打手订单中心（状态 tabs + 完成订单）
└── components/order/
    ├── PayDialog.vue                        # 扫码支付弹层（轮询支付结果）
    ├── OrderStatusTabs.vue                  # 订单状态筛选：移动横滑，PC 居中分段筛选
    ├── OrderCard.vue                        # 单条订单卡片：快照/金额/状态/取消/评价，点击进详情
    ├── BoosterOrderCard.vue                 # 打手侧订单卡片（大厅/订单中心共用，接单后展示账号信息）
    ├── RemarkMediaUploader.vue              # 下单备注图片/视频上传
    └── RemarkMediaGallery.vue               # 备注附件展示（详情页共用）

apps/web/src/
├── api/order.api.ts                         # 管理端订单列表/详情/加入订单群
├── views/order/OrderAdminView.vue           # 订单管理页（筛选/分页/详情抽屉/下发/指派/进订单群）
├── components/order/OrderDetailDrawer.vue   # 详情抽屉（完整字段 + 价格明细 + 订单群入口）
└── components/order/AssignBoosterDialog.vue # 指派打手弹窗（远程搜索打手候选）
```

## 设计要点

- **策略模式复用**：订单收款直接复用钱包模块 `PaymentResolver` → `PaymentPort`（支付宝/微信驱动），
  仅回调地址不同（`/order/pay/callback/:provider`），新增渠道零改动
- **幂等回调**：以 `orderNo`（商户订单号，前缀 `O`）为幂等键，事务内行锁校验
  「待付款 + 金额一致」才落账，重复回调直接应答成功
- **快照固化**：订单固化商品标题/封面/关联客服，商品后续改动不影响历史订单；
  `serviceAgentId` 快照用于建群拉客服、客服可见性过滤与指派打手归属判定
- **订单群编排**：`OrderGroupService` 复用 im 模块 `GroupFacade` 建群/进群，
  建群/进群失败仅记日志，不阻断支付落账与接单主流程；重复落账幂等（已有 `conversationId` 跳过）；
  平台管理员解析优先租户管理员、无则回退超管（`resolveAdminIds`），避免后台无人在群看不到订单群；
  后台未在群的工作人员可经 `JoinOrderGroupUseCase` 幂等加群后进入会话
- **C 端 UI 分层**：`MyOrdersView` 只负责页面状态与接口编排，状态筛选和订单卡片分别下沉到
  `OrderStatusTabs`、`OrderCard`，避免 PC/移动端样式互相污染，也让单文件保持在 500 行以内
- **身份切换与导航**：`role.store` 只维护当前激活身份（是否拥有 booster 角色由 auth.store 角色码派生，
  无角色时强制回退老板）；`AppTabBar`/`AppTopNav` 按身份选用 `NAV_ITEMS`/`BOOSTER_NAV_ITEMS`
- **打手接口防线在后端**：大厅/接单/打手订单接口统一经 `BoosterAccess.assert` 断言 booster 角色，
  前端导航仅是展示层控制；角色授予/回收后 `RoleGranter` 会失效权限缓存，新角色即时生效

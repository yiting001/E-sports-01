# 服务订单模块（order）

用户在 C 端商品详情页下单陪玩/代打服务，扫码支付（支付宝/微信），
支付成功后订单进入「待客服处理」；客服可把订单下发接单大厅，
打手（booster 角色）在大厅接单 → 服务 → 完成。

## 实现的功能

- C 端商品详情页：封面/标题/价格/富文本详情，PC 端导航与详情主体同轴收敛，选择数量、备注、支付方式后下单
- 下单支付：复用钱包模块的支付宝/微信收款驱动（策略模式），返回扫码二维码，前端轮询支付结果
- 支付回调：渠道异步回调验签解析，事务 + 行锁内幂等落账（待付款 → 待客服处理），并累加商品销量
- 我的订单：分页列表（商品快照/数量/金额/状态），待付款订单可取消；PC 端标题、筛选 tabs、列表统一收敛到内容区宽度，移动端保持全屏滚动
- 管理端订单管理：分页检索全量订单（状态/订单号过滤）+ 详情抽屉（商品快照/归属用户/关联客服/渠道交易号），
  权限码 `order:admin:list` / `order:admin:detail`，菜单「电竞运营 / 订单管理」由播种器幂等补齐
- 支付渠道配置沿用配置中心既有 `wallet.*` 键（网关地址、商户密钥、回调基址 `wallet.notify.base-url`），无新增配置
- 下发大厅：管理端「待客服处理」订单可下发接单大厅（权限码 `order:admin:dispatch`），订单进入「待接单」
- 接单大厅（C 端打手身份）：分页浏览待接单订单，接单后回填 `boosterId` 并进入「服务中」；不能接自己的单
- 打手订单中心（C 端打手身份）：分页查看本人接下的订单（全部/服务中/已完成），服务中可标记完成
- C 端身份切换：拥有 booster 角色的账号可在「我的」页切换老板/打手身份（本地持久化），
  打手身份下一级导航变为「接单大厅/订单中心/消息/我的」；接单接口由后端 `BoosterAccess` 断言角色

## 订单状态机

```
pending_payment（待付款）
   ├─ 支付回调成功 ──▶ pending_service（待客服处理）
   └─ 用户取消 ──────▶ cancelled（已取消）
pending_service（待客服处理）
   └─ 客服下发大厅 ─▶ dispatching（待接单）
 dispatching ── 打手接单 ──▶ serving（服务中）── 打手完成 ──▶ completed（已完成）
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
│   └── use-cases/
│       ├── create-order.usecase.ts          # 校验在架 → 固化快照 → 渠道下单取二维码
│       ├── handle-order-callback.usecase.ts # 回调验签 → 幂等标记已支付 + 累加销量
│       ├── get-my-order.usecase.ts          # 单笔查询（支付轮询）
│       ├── list-admin-orders.usecase.ts     # 管理端分页检索（状态/订单号过滤）
│       ├── get-admin-order.usecase.ts       # 管理端单笔详情
│       ├── list-my-orders.usecase.ts        # 我的订单分页
│       ├── cancel-my-order.usecase.ts       # 取消待付款订单
│       ├── dispatch-order.usecase.ts        # 客服下发大厅（待客服处理 → 待接单）
│       ├── list-hall-orders.usecase.ts      # 接单大厅分页（仅打手）
│       ├── accept-hall-order.usecase.ts     # 打手接单（待接单 → 服务中，回填 boosterId）
│       ├── list-booster-orders.usecase.ts   # 打手订单中心分页（可按状态过滤）
│       └── complete-booster-order.usecase.ts# 打手完成服务（服务中 → 已完成）
├── interfaces/
│   ├── dto/create-order.dto.ts
│   ├── dto/order-admin-list-query.dto.ts    # 分页 + 状态/订单号过滤
│   └── controllers/                         # 一个路由一个文件
│       ├── order.create.controller.ts       # POST /order
│       ├── order.callback.controller.ts     # POST /order/pay/callback/:provider（公开）
│       ├── order.mine.list.controller.ts    # GET  /order/mine
│       ├── order.admin.list.controller.ts   # GET  /order/admin（order:admin:list）
│       ├── order.admin.detail.controller.ts # GET  /order/admin/:id（order:admin:detail）
│       ├── order.admin.dispatch.controller.ts # POST /order/admin/:id/dispatch（order:admin:dispatch）
│       ├── order.hall.list.controller.ts    # GET  /order/hall（仅打手）
│       ├── order.hall.accept.controller.ts  # POST /order/hall/:id/accept（仅打手）
│       ├── order.booster.list.controller.ts # GET  /order/booster/mine（仅打手）
│       ├── order.booster.complete.controller.ts # POST /order/booster/:id/complete（仅打手）
│       ├── order.mine.detail.controller.ts  # GET  /order/:id
│       └── order.cancel.controller.ts       # POST /order/:id/cancel
└── order.module.ts                          # 模块装配（静态路由先于 :id 注册）

复用的既有能力：
- commerce：GET /commerce/public/products/:id（本次新增公开商品详情）+ 商品仓储导出
- wallet：PaymentResolver / PaymentPort 策略（支付宝/微信驱动、验签、应答报文）

apps/client/src/
├── api/order.api.ts                         # 下单/详情/我的订单/取消/大厅/接单/打手订单/完成
├── stores/role.store.ts                     # 身份切换状态（老板/打手，本地持久化）
├── config/nav.ts                            # 老板/打手两套一级导航配置
├── views/product/ProductDetailView.vue      # 商品详情（纯展示，立即下单进下单页）
├── views/product/ProductDetailView.responsive.css # 商品详情 PC 响应式布局
├── views/order/CheckoutView.vue             # 下单页（数量/备注/支付方式 → 扫码支付）
├── views/order/MyOrdersView.vue             # 我的订单页编排（筛选/分页/评价弹层）
├── views/order/HallView.vue                 # 接单大厅（打手一级 Tab，接单）
├── views/order/BoosterOrdersView.vue        # 打手订单中心（状态 tabs + 完成订单）
└── components/order/
    ├── PayDialog.vue                        # 扫码支付弹层（轮询支付结果）
    ├── OrderStatusTabs.vue                  # 订单状态筛选：移动横滑，PC 居中分段筛选
    ├── OrderCard.vue                        # 单条订单卡片：快照/金额/状态/取消/评价
    └── BoosterOrderCard.vue                 # 打手侧订单卡片（大厅/订单中心共用）

apps/web/src/
├── api/order.api.ts                         # 管理端订单列表/详情
├── views/order/OrderAdminView.vue           # 订单管理页（筛选/分页/详情抽屉）
└── components/order/OrderDetailDrawer.vue   # 详情抽屉（完整字段）
```

## 设计要点

- **策略模式复用**：订单收款直接复用钱包模块 `PaymentResolver` → `PaymentPort`（支付宝/微信驱动），
  仅回调地址不同（`/order/pay/callback/:provider`），新增渠道零改动
- **幂等回调**：以 `orderNo`（商户订单号，前缀 `O`）为幂等键，事务内行锁校验
  「待付款 + 金额一致」才落账，重复回调直接应答成功
- **快照固化**：订单固化商品标题/封面/关联客服，商品后续改动不影响历史订单；
  `serviceAgentId` 快照为后续「客服拉群/指派打手」预留
- **C 端 UI 分层**：`MyOrdersView` 只负责页面状态与接口编排，状态筛选和订单卡片分别下沉到
  `OrderStatusTabs`、`OrderCard`，避免 PC/移动端样式互相污染，也让单文件保持在 500 行以内
- **身份切换与导航**：`role.store` 只维护当前激活身份（是否拥有 booster 角色由 auth.store 角色码派生，
  无角色时强制回退老板）；`AppTabBar`/`AppTopNav` 按身份选用 `NAV_ITEMS`/`BOOSTER_NAV_ITEMS`
- **打手接口防线在后端**：大厅/接单/打手订单接口统一经 `BoosterAccess.assert` 断言 booster 角色，
  前端导航仅是展示层控制；角色授予/回收后 `RoleGranter` 会失效权限缓存，新角色即时生效

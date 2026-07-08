# 排行榜（rank）

## 实现了什么

1. **打手榜**：按已完成订单数倒序取前 10 名（聚合 `service_order`，`status = completed` 按 boosterId 分组计数）。
2. **消费榜**：按累计消费金额倒序取前 10 名（复用会员模块的 `member_profile.spend_fen`，支付成功时已累加）。
3. **隐私保护**：昵称脱敏展示（保留首尾字符，中间打星；空名回退「匿名玩家」）。

4. **后台显隐开关**：配置中心「运营」组 `portal.showRank`（布尔，默认开启）控制 C 端排行榜显隐：关闭后个人中心「更多功能」隐藏排行榜入口，直接访问 `/rank` 也会返回个人中心。C 端经公开接口 `GET /config/portal`（`PortalConfigView`）读取，由 `stores/portal.store.ts` 启动时拉取。

纯只读聚合既有数据，不落新表、不加定时任务；登录即可查看（无需额外权限）。

## 结构导图

```
packages/contracts/src/rank/rank.ts               # RankEntryView / RankBoardView / RANK_TOP_LIMIT
apps/server/src/modules/rank/
├── domain/rank-repository.interface.ts           # 聚合端口（topBoosters / topSpenders）
├── infrastructure/rank.repository.ts             # TypeORM 聚合实现（租户过滤，昵称回退用户名）
├── application/
│   ├── name-mask.util.ts                         # 展示名脱敏
│   └── use-cases/get-rank-board.usecase.ts       # 组装双榜 + 脱敏
├── interfaces/controllers/rank.board.controller.ts  # GET /rank/board（登录态）
└── rank.module.ts

apps/server/src/modules/config/
├── application/use-cases/get-portal-config.usecase.ts  # 读 portal.showRank 等门户开关
└── interfaces/get-portal-config.controller.ts          # GET /config/portal（公开）

apps/client/src/
├── api/rank.api.ts
├── stores/portal.store.ts                        # 门户开关状态（showRank）
├── components/profile/FeatureGrid.vue            # 入口按开关过滤
└── views/rank/RankView.vue                       # 打手榜/消费榜双 Tab（关闭时回退个人中心）
```

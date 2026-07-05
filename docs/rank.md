# 排行榜（rank）

## 实现了什么

1. **打手榜**：按已完成订单数倒序取前 10 名（聚合 `service_order`，`status = completed` 按 boosterId 分组计数）。
2. **消费榜**：按累计消费金额倒序取前 10 名（复用会员模块的 `member_profile.spend_fen`，支付成功时已累加）。
3. **隐私保护**：昵称脱敏展示（保留首尾字符，中间打星；空名回退「匿名玩家」）。

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

apps/client/src/
├── api/rank.api.ts
└── views/rank/RankView.vue                       # 打手榜/消费榜双 Tab
```

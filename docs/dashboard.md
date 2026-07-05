# 数据统计仪表盘（Dashboard）

## 模块职责

对既有业务表（订单/钱包流水/用户/打手/会员）做只读聚合统计，在管理端工作台按权限分块展示图表（ECharts）。不落任何新表、不做任何写入；统计按业务域分为四块，一块一接口一权限码，时间范围统一支持日/月/年三档。

实现的功能：

- **订单运营**（`dashboard:orders`）：下单/支付/完成单量、GMV（支付实付）、会员折扣让利、下单量与 GMV 趋势、订单状态分布、商品销量 Top10。
- **财务资金**（`dashboard:finance`）：充值/提现/提成/罚款/押金缴退各类型金额合计、收支（流入/流出）趋势、流水类型金额分布。
- **用户增长**（`dashboard:users`）：累计/新增用户、注册趋势、会员等级分布（复用 `member.levels` 档位实时定级）。
- **打手生态**（`dashboard:boosters`）：累计入驻/待审/新增申请、申请趋势、打手等级分布（复用 `booster.levels` 档位实时定级）。
- **时间范围**：日=近 30 天按日、月=近 12 个月按月、年=近 5 年按年（UTC 分桶，空区间补零）。
- **权限分块**：四个权限码在角色管理中自由分配，工作台只渲染当前账号可见的统计块，接口侧同样由 `@Permissions` 守卫。

## 结构导图（DDD 四层）

```
apps/server/src/modules/dashboard/
├─ domain/
│  └─ stats-repository.interface.ts     统计仓储端口（窗口/汇总/趋势/分布只读查询）
├─ application/
│  ├─ range.util.ts                     日/月/年档位 → 查询窗口 + bucket 序列；趋势补零
│  └─ use-cases/                        一块一用例
│     ├─ get-order-stats.usecase.ts
│     ├─ get-finance-stats.usecase.ts
│     ├─ get-user-stats.usecase.ts      等级分布复用 MemberLevelService 档位
│     └─ get-booster-stats.usecase.ts   等级分布复用 BoosterPolicyService 档位
├─ infrastructure/
│  └─ stats.repository.ts               TypeORM 只读聚合（to_char 分桶；按租户过滤）
└─ interfaces/
   ├─ dto/stats-query.dto.ts            range 入参校验（缺省按日）
   └─ controllers/                      一路由一文件（orders / finance / users / boosters）

apps/web/src/
├─ api/dashboard.api.ts                 四个统计接口
├─ components/dashboard/
│  ├─ EChart.vue                        ECharts 通用包装（生命周期 + 自适应尺寸）
│  ├─ chart-options.ts                  折线/柱状/收支/饼图/榜单配置工厂 + 分转元
│  └─ *StatsPanel.vue                   四个统计块组件（自拉数据，range 由页面下发）
└─ views/DashboardView.vue              工作台：范围切换 + 按权限渲染统计块
```

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | /dashboard/orders?range= | dashboard:orders | 订单运营统计 |
| GET | /dashboard/finance?range= | dashboard:finance | 财务资金统计 |
| GET | /dashboard/users?range= | dashboard:users | 用户增长统计 |
| GET | /dashboard/boosters?range= | dashboard:boosters | 打手生态统计 |

`range` 取值 `day | month | year`，契约见 `packages/contracts/src/dashboard/dashboard.ts`。

## 设计要点

- **只读跨模块聚合**：仪表盘是典型的读模型（CQRS 读侧），仓储实现直接对各业务实体做聚合查询，不经由各业务模块仓储，避免为统计在各模块扩散一堆聚合方法；所有查询经 `applyTenant`/`withTenant` 按租户隔离。
- **等级分布不落库**：会员/打手等级本就按「档位配置 + 基数」读时解析，分布统计同样按档位区间 `[本档门槛, 下一档门槛)` 直接 COUNT，档位调整立即反映到图表。
- **金额单位**：后端一律返回分（整数），前端图表统一经 `fenToYuanText` 转元展示。
- **图表选型**：ECharts 覆盖折线/柱状/饼图/榜单全部场景；D3/Three.js 对当前统计维度过重，未引入（后续如需关系图/3D 大屏可在 `components/dashboard/` 内增量接入）。

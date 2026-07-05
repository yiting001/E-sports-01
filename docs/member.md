# 用户会员等级（Member）

## 模块职责

用户按累计消费金额自动定级的会员体系：等级档位（名称/累计消费门槛/下单折扣万分比）由管理端在「会员等级」页配置（存配置中心 `member.levels`），支付成功即累计消费额，下单时按当前等级折扣计算应付金额并在订单上固化原价/折扣快照。

实现的功能：

- **档位配置**：管理端增删改档位并保存（`member:level:set`）；配置为空时回退契约默认档位 `MEMBER_LEVEL_DEFAULTS`。
- **自动定级**：等级不落库，读时由「档位 + 累计消费」实时解析（`resolveMemberLevel`），改档位即时生效。
- **下单折扣**：创建订单时按当前等级折扣（万分比）计算应付（`calcDiscountedFen`，向上取整保证平台不亏损），订单固化 `originalAmountFen`/`discountBp` 快照。
- **消费累计**：支付回调成功后经 `MemberProgressService.recordSpend` 原子累加（并发安全：插入冲突回退为增量更新）。
- **C 端概览**：`GET /member/mine` 返回当前等级/折扣/累计消费与晋升下一等级还需金额。

## 结构导图（DDD 四层）

```
modules/member/
├─ domain/
│  ├─ member-profile.entity.ts          会员画像（租户内 user 唯一；累计消费 spendFen）
│  └─ member-repository.interface.ts    仓储端口（含原子累加 increaseSpend）
├─ application/
│  ├─ member-level.service.ts           档位读写/校验 + 定级解析 + mine 视图组装
│  ├─ member-progress.service.ts        消费累计（供 order 模块支付回调调用，导出）
│  └─ use-cases/                        get-my-member / get·set-member-levels
├─ infrastructure/
│  └─ member.repository.ts              TypeORM 实现（按租户过滤；并发安全累加）
└─ interfaces/
   ├─ dto/set-member-levels.dto.ts
   └─ controllers/                      一路由一文件（mine / levels.get / levels.set）
```

前端：

- 管理端 `web/views/member/MemberLevelAdminView.vue`（菜单 `member:menu` 会员等级，电竞运营分组）：档位表格编辑（名称/消费门槛（元）/折扣万分比，增删行 + 保存）。
- C 端 `client/components/profile/MemberLevelCard.vue`（「我的」页购物身份）：当前等级/折扣/累计消费与晋升进度展示。

## 权限（RBAC）

| 权限码 | 名称 | 守卫接口 |
| --- | --- | --- |
| `member:menu` | 会员等级（菜单） | 前端动态路由 `/member/levels`（管理后台） |
| `member:level:set` | 会员-等级配置 | `PUT /member/levels` |

> `GET /member/mine`、`GET /member/levels` 仅需登录态。

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/member/mine` | 登录 | `{ level, levelName, discountBp, spendFen, spendYuan, nextLevelName, nextNeedFen }` |
| GET | `/member/levels` | 登录 | 档位列表 |
| PUT | `/member/levels` | `member:level:set` | 保存档位 `{ tiers }` |

## 设计要点（无硬编码 / 最小化）

- **配置驱动**：档位存配置中心 `CONFIG_KEYS.member.levels`（分组 `ConfigGroup.Member`），前后端共用契约 `MemberLevelTier` 与校验常量 `MEMBER_LEVEL_LIMITS`。
- **金额契约**：金额一律以分（整数）存取；折扣/费率一律万分比（`FEE_RATE_BASE = 10000`），与钱包模块口径一致。
- **最小写口**：仅导出 `MemberLevelService`（定级/折扣解析）与 `MemberProgressService`（消费累计）给 order 模块，避免跨模块直接操作仓储。
- **多租户**：实体继承 `TenantScopedEntity`，仓储经 `withTenant` 行级隔离。

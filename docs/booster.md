# 打手入驻（Booster）

## 模块职责

用户在 C 端个人中心提交打手入驻申请（游戏昵称 + 擅长游戏 + 段位 + 自我介绍），管理员在管理端「打手管理」审核通过 / 驳回；通过后自动为该用户授予内置 `booster`（打手）角色，驳回可修改后重提；管理端还可对打手资料进行编辑维护。

实现的功能：

- **自助申请 / 重提**：未申请或被驳回时可（重新）提交；已通过或审核中拒绝重复提交。
- **审核工作流**：状态机 `none →(提交) pending →(审核) approved / rejected`；`rejected` 可覆盖重提回到 `pending`。
- **角色授予**：审核通过时经 RBAC 的 `RoleGranter` 幂等地为申请人授予 `booster` 角色（角色由播种器内置，管理员也可在用户管理中手动调整）。
- **资料维护**：管理端可编辑打手的游戏昵称/擅长游戏/段位/自我介绍（不改变审核状态）。

## 结构导图（DDD 四层）

```
modules/booster/
├─ domain/
│  ├─ booster-application.entity.ts     聚合根（租户内 user 唯一；申请资料 + 状态机）
│  └─ booster-repository.interface.ts   仓储端口
├─ application/
│  ├─ booster.mapper.ts                 实体 → 视图
│  └─ use-cases/                        get-my / submit / list / review / update
├─ infrastructure/
│  └─ booster.repository.ts             TypeORM 实现（按租户过滤）
└─ interfaces/
   ├─ dto/                              submit / review / update / list-query
   └─ controllers/                      一路由一文件（mine/submit/list/review/update）

modules/rbac/
├─ application/role-granter.service.ts  对外角色授予/回收最小写口（模块导出）
└─ infrastructure/rbac.seeder.ts        ensureBoosterRole：内置「打手」角色幂等播种
```

前端：

- C 端 `client/views/profile/BoosterApplyView.vue`（入口：「我的」页更多功能 →「打手入驻」，路由 `/profile/booster`）：按状态分场景展示申请表单 / 审核进度 / 入驻资料 / 驳回理由与重提。
- 管理端 `web/views/booster/BoosterAdminView.vue`（菜单 `booster:menu` 打手管理，电竞运营分组）：状态筛选 + 审核通过/驳回 + 资料编辑弹窗。

## 权限（RBAC）

| 权限码 | 名称 | 守卫接口 |
| --- | --- | --- |
| `booster:menu` | 打手管理（菜单） | 前端动态路由 `/booster`（管理后台） |
| `booster:list` | 打手-查询 | `GET /booster` |
| `booster:review` | 打手-入驻审核 | `POST /booster/:id/review` |
| `booster:update` | 打手-资料编辑 | `PUT /booster/:id` |

> `GET /booster/mine`、`POST /booster` 仅需登录态，所有角色可用（自助）。管理类接口默认仅超管，其余角色在「角色管理」按需分配。

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/booster/mine` | 登录 | `{ status, record }` |
| POST | `/booster` | 登录 | 提交/重提 `{ gameNickname, gameName, rank, intro }` |
| GET | `/booster` | `booster:list` | 分页 `?page&pageSize&status` |
| POST | `/booster/:id/review` | `booster:review` | `{ approve, rejectReason? }`；通过即授予 booster 角色 |
| PUT | `/booster/:id` | `booster:update` | 编辑资料（字段可选，仅更新传入项） |

## 设计要点（无硬编码 / 最小化）

- **角色码单一来源**：`BOOSTER_ROLE_CODE` 定义在 `@app/contracts`，播种器、审核用例共用；字段长度限制 `BOOSTER_LIMITS` 前后端共用同一校验规则。
- **RBAC 边界收口**：业务模块不直接操作 RBAC 仓储，通过 RbacModule 导出的 `RoleGranter`（grant/revoke 均幂等）授予角色，供后续其他入驻类业务复用。
- **复用既有模式**：状态机、仓储、控制器拆分与实名认证（realname）保持一致的结构与命名，降低维护成本。
- **多租户**：实体继承 `TenantScopedEntity`，仓储经 `withTenant` 行级隔离。

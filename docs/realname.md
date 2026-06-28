# 实名认证（Realname）

## 模块职责

用户提交真实姓名 + 身份证号 + 证件正反面照片，经管理员审核通过 / 驳回；超级管理员经配置中心设定「哪些角色需要实名」，命中角色的用户在「实名认证」页收到提示。身份证号加密入库、对外脱敏。

实现的功能：

- **自助提交 / 重提**：未提交或被驳回时可（重新）提交；已通过或审核中拒绝重复提交。
- **审核工作流**：状态机 `none →(提交) pending →(审核) approved / rejected`；`rejected` 可覆盖重提回到 `pending`。
- **策略配置**：超管选择需实名的角色 code 集合（存配置中心，零硬编码）；某用户是否需实名 = 其任一角色命中该集合。
- **隐私保护**：身份证号经 **AES-256-GCM** 加密存储，另存脱敏串供展示；接口一律只返回脱敏号，绝不回明文。

## 结构导图（DDD 四层）

```
modules/realname/
├─ domain/
│  ├─ realname-auth.entity.ts          聚合根（租户内 user 唯一；密文+脱敏串+状态机）
│  ├─ realname-repository.interface.ts  仓储端口
│  ├─ id-card-cipher.interface.ts       身份证加解密端口（ID_CARD_CIPHER）
│  └─ realname.constants.ts             加密密钥配置键
├─ application/
│  ├─ policy.service.ts                 需实名角色集合的读写与命中判定（收口配置）
│  ├─ realname.mapper.ts                实体 → 脱敏视图
│  └─ use-cases/                        get-my / submit / list / review / get-policy / set-policy
├─ infrastructure/
│  ├─ realname.repository.ts            TypeORM 实现（按租户过滤）
│  ├─ id-card.cipher.ts                 AES-256-GCM 实现（密钥取自配置中心）
│  └─ realname.seeder.ts                首次随机生成加密密钥并持久化（幂等）
└─ interfaces/
   ├─ dto/                              submit / review / set-policy / list-query
   └─ controllers/                      一路由一文件（mine/submit/list/review/policy.get/policy.set）
```

前端：`web/views/realname/RealnameMineView.vue`（用户提交/查看，入口在头像下拉「实名认证」），`web/views/realname/RealnameAdminView.vue`（菜单 `realname:menu`，审核 + 策略设置）。

## 权限（RBAC）

| 权限码 | 名称 | 守卫接口 |
| --- | --- | --- |
| `realname:menu` | 实名管理（菜单） | 前端动态路由 `/realname`（管理后台） |
| `realname:list` | 实名-审核列表 | `GET /realname` |
| `realname:review` | 实名-审核 | `POST /realname/:id/review` |
| `realname:policy` | 实名-策略配置 | `GET|PUT /realname/policy` |

> `GET /realname/mine`、`POST /realname` 仅需登录态，所有角色可用（自助）。管理类接口默认仅超管，其余角色在「角色管理」按需分配。

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/realname/mine` | 登录 | `{ required, status, record }` |
| POST | `/realname` | 登录 | 提交/重提 `{ realName, idCardNo, frontImage, backImage }` |
| GET | `/realname` | `realname:list` | 分页 `?page&pageSize&status` |
| POST | `/realname/:id/review` | `realname:review` | `{ approve, rejectReason? }` |
| GET | `/realname/policy` | `realname:policy` | `{ requiredRoleCodes }` |
| PUT | `/realname/policy` | `realname:policy` | `{ requiredRoleCodes }` |

## 设计要点（无硬编码 / 最小化）

- **加密密钥不写死**：`realname.idCipherKey` 由 `RealnameSeeder` 首次启动随机生成（`randomBytes(32)`）并存入配置中心（secret），后续启动复用，保证可解密历史数据。
- **策略入配置中心**：`realname.requiredRoleCodes`（实名组，JSON 数组）为单一来源，由 `RealnamePolicyService` 收口读写；命中判定集中一处。
- **多租户**：实体继承 `TenantScopedEntity`，仓储经 `withTenant` 行级隔离。
- **契约共享**：`RealnameStatus`、`RealnameView`、`SubmitRealnamePayload`、`maskIdCard` 等在 `@app/contracts`，前后端共用同一脱敏与校验规则（`CHINA_ID_CARD_PATTERN`）。

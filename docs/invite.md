# 邀请（invite）

## 实现了什么

1. **C 端邀请好友**：「我的 → 邀请好友」进入邀请页，展示我的邀请码（一人一码、首次访问惰性生成、一键复制）、当前双方可得奖励说明与我的邀请记录（好友昵称 + 我获得的奖励快照）。
2. **填码绑定**：新用户在**注册页**填写好友的 8 位邀请码（选填），注册成功自动绑定（绑定失败不阻断注册，仅提示）；已注册未绑定的用户也可在邀请页补填；校验邀请码存在、非本人、一个用户只能被邀请一次（invitee 唯一约束兜底防并发）。
3. **奖励发放**：绑定成功即按后台配置向**邀请人**与**被邀请人**分别发放奖励——优惠券（系统发券，不受单人限领约束、仍防超发）或钱包金额（经账务单元入账，流水类型 `invite_reward`）；发放失败不阻断绑定，结果文案快照落记录追溯。
4. **后台邀请管理**：菜单「邀请管理」（commerce 组）。奖励配置分邀请人/被邀请人两侧（不发放 / 优惠券 / 钱包金额），保存前校验（券须存在且上架、金额须为正整数分），配置落配置中心（`invite.*` 键，group=invite）即时生效；下方分页展示邀请记录（邀请双方 + 奖励发放结果快照）。
5. **邀请规则富文本**：后台「邀请管理」内富文本编辑邀请规则（`invite.rules` 键，RichText），C 端邀请页「邀请规则」区块 DOMPurify 消毒后展示，留空不展示。

## 结构导图

```
packages/contracts/src/invite/invite.ts       # InviteRewardType / InviteConfigView / MyInviteView / 记录视图 / INVITE_LIMITS
apps/server/src/modules/invite/
├── domain/
│   ├── invite-code.entity.ts                 # 邀请码（user_id 唯一 + code 唯一）
│   ├── invite-record.entity.ts               # 邀请记录（invitee_id 唯一防重复绑定 + 奖励文案快照）
│   └── invite-repository.interface.ts        # 仓储端口 + 注入令牌
├── infrastructure/invite.repository.ts       # TypeORM 实现（租户过滤）
├── application/
│   ├── invite-code.service.ts                # 一人一码惰性生成（撞码重试/并发回查幂等）
│   ├── invite-config.service.ts              # 奖励配置读写（落配置中心）+ 校验 + 奖励说明文案
│   ├── invite-reward.service.ts              # 奖励发放（券走 CouponGrantService / 钱包走 WalletLedger）
│   └── use-cases/
│       ├── get-my-invite.usecase.ts          # C 端我的邀请
│       ├── bind-invite.usecase.ts            # 填码绑定 + 双方奖励发放
│       └── list-invite-records.usecase.ts    # 管理端记录分页
├── interfaces/
│   ├── dto/bind-invite.dto.ts
│   ├── dto/save-invite-config.dto.ts
│   └── controllers/                          # 一路由一文件
│       ├── invite.mine.controller.ts         # GET  /invite/mine
│       ├── invite.bind.controller.ts         # POST /invite/bind
│       ├── invite.admin.config-get.controller.ts   # GET /invite/admin/config
│       ├── invite.admin.config-save.controller.ts  # PUT /invite/admin/config
│       └── invite.admin.records.controller.ts      # GET /invite/admin/records
└── invite.module.ts

apps/web/src/
├── api/invite.api.ts                         # 配置读写 + 记录分页
├── views/invite/InviteAdminView.vue          # 邀请管理页（配置 + 记录）
└── components/invite/InviteRewardConfigForm.vue  # 单侧奖励配置表单（元输入换算分）

apps/client/src/
├── api/invite.api.ts                         # mine / bind
├── views/auth/LoginView.vue                  # 注册页填邀请码（选填，注册成功自动绑定）
└── views/invite/InviteView.vue               # 邀请好友页（码/复制/填码/规则/记录）
```

## 接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /invite/mine | 我的邀请（码/奖励说明/记录） | 登录 |
| POST | /invite/bind | 填码绑定邀请关系并发放奖励 | 登录 |
| GET | /invite/admin/config | 读取邀请奖励配置 | invite:config:set |
| PUT | /invite/admin/config | 保存邀请奖励配置 | invite:config:set |
| GET | /invite/admin/records | 分页查询邀请记录 | invite:record:list |

## 设计要点

- **配置零硬编码**：奖励方式/券模板/入账金额/邀请规则共 7 个键登记在 `CONFIG_KEYS.invite`（配置中心 group=invite，启动播种默认「不发放」），后台改配置即时生效，绑定时实时读取。
- **一人只能被邀请一次**：`invite_record.invitee_id` 唯一索引，业务校验 + 数据库约束双保险，并发重复填码只有一次成功。
- **奖励快照**：发放结果以文案快照落记录（如「优惠券『满50减10』」「钱包入账 5.00 元」「发放失败：优惠券库存不足」），后台改配置不影响历史记录展示，失败可追溯。
- **复用而非重写**：发券复用优惠券模块（新增 `CouponGrantService` 系统发券出口，防超发逻辑与领取共用仓储原子自增）；入账复用钱包账务单元 `WalletLedger.adjustBalance`（新增流水类型 `invite_reward`，C 端流水明细自动显示「邀请奖励」）。
- **发放不阻断绑定**：奖励发放异常（券下架/库存不足等）仅记录失败文案，不回滚邀请关系，避免用户侧绑定反复失败。

# 优惠券（coupon）

## 实现了什么

1. **管理端发券**：新建/编辑/删除优惠券（满减/折扣、使用门槛、发行总量、单人限领、有效期、上架开关），权限码 `coupon:list/save/remove`，菜单「优惠券管理」。
2. **C 端领券中心**：展示上架且在有效期内的券（剩余张数、我已领张数），点击领取；条件自增 `issuedCount < totalCount` 原子防超发，单人限领校验。
3. **我的优惠券**：领取时快照券面信息（券名/面值/门槛/到期时间）到 `user_coupon`，后续管理端改券不影响已领的券；按可用/已使用/已过期展示。
4. **下单抵扣**：下单页选券（前端按 contracts 共享的 `calcCouponDeductionFen` 预览抵扣，与后端同口径），后端在会员折后价上再抵扣，实付至少保留 1 分；条件核销（未使用 → 已使用）防并发重复用券，订单取消时自动回滚券为未使用。

## 结构导图

```
packages/contracts/src/coupon/coupon.ts     # CouponType / UserCouponStatus / 视图契约 / calcCouponDeductionFen
apps/server/src/modules/coupon/
├── domain/
│   ├── coupon.entity.ts                    # 券模板（库存/限领/有效期/上架）
│   ├── user-coupon.entity.ts               # 用户券（领取时券面快照 + 状态 + usedOrderId）
│   └── coupon-repository.interface.ts      # 仓储端口（tryIncrementIssued/markUsed/restoreByOrder 等）
├── infrastructure/coupon.repository.ts     # TypeORM 实现（原子条件自增/条件核销，租户过滤）
├── application/
│   ├── coupon.mapper.ts                    # 实体 → 管理端/领券中心/我的券视图
│   ├── coupon-redeem.service.ts            # 供订单模块调用：校验抵扣 / 核销 / 回滚
│   └── use-cases/                          # 管理列表/保存/删除 + 领券中心/领取/我的券（一用例一文件）
├── interfaces/
│   ├── dto/upsert-coupon.dto.ts
│   └── controllers/                        # 一路由一文件（admin CRUD + center/claim/mine）
└── coupon.module.ts                        # 导出 CouponRedeemService 供 order 模块复用

apps/web/src/
├── api/coupon.api.ts                       # 管理端券 CRUD
├── views/coupon/CouponAdminView.vue        # 券列表 + 领取进度
└── components/coupon/CouponFormDialog.vue  # 券编辑弹窗（元/折输入换算分/万分比）

apps/client/src/
├── api/coupon.api.ts                       # center / claim / mine
├── views/coupon/CouponCenterView.vue       # 领券中心
├── views/coupon/MyCouponsView.vue          # 我的优惠券
├── views/coupon/coupon-format.ts           # 券面/门槛/日期文案
└── views/order/CheckoutView.vue            # 下单选券抵扣（预览与后端同口径）
```

## 接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /coupon/admin | 分页查询券 | coupon:list |
| POST | /coupon/admin | 新建券 | coupon:save |
| PUT | /coupon/admin/:id | 编辑券 | coupon:save |
| DELETE | /coupon/admin/:id | 删除券 | coupon:remove |
| GET | /coupon/center | 领券中心列表 | 登录 |
| POST | /coupon/:id/claim | 领取券 | 登录 |
| GET | /coupon/mine | 我的优惠券 | 登录 |

## 设计要点

- **防超发**：`UPDATE coupon SET issued_count = issued_count + 1 WHERE id = ? AND issued_count < total_count`，原子条件自增，并发领取不会超出库存。
- **防重复用券**：核销走 `UPDATE ... WHERE status = 'unused'` 条件更新，并发下单同一张券只有一单成功；核销失败则订单作废。
- **快照隔离**：用户券记录领取时的券面信息，管理端改券/删券不影响已领出的券。
- **同口径计价**：抵扣计算函数 `calcCouponDeductionFen` 放在 contracts，前端预览与后端结算共用，杜绝两端口径漂移。

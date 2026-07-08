# 商品评论模块（review）

用户对本人「已完成」订单发表评分 + 文字评论（一单一评），
商品详情页免登录展示可见评论与平均分，管理端可检索/隐藏/恢复/删除评论。

## 实现的功能

- C 端商品详情页：评论区展示可见评论分页列表（评论人昵称脱敏）、评论总数与平均分，到底部加载更多
- C 端我的订单页：已完成订单展示「评价」按钮，弹层打星（1-5）+ 填写评论提交；已评订单标记「已评价」
- 提交校验链：订单存在 → 归属本人 → 状态已完成 → 该订单未评论过（orderId 唯一索引兜底幂等）
- 评论固化订单号/商品标题快照，商品改名不影响历史评论
- 管理端评论管理：分页检索（星级/可见状态过滤）+ 统计卡片 + 隐藏/恢复（软隐藏）+ 删除（硬删除），
  权限码 `review:admin:list` / `review:admin:moderate` / `review:admin:remove`，
  菜单「电竞运营 / 评论管理」由播种器幂等补齐
- 隐藏为软操作：不在商品详情页露出，但保留记录且用户仍视为「已评价」；删除后该订单可重新评价
- 营销工具（商品管理「营销」入口）：管理端可编辑商品已售销量（复用商品更新接口 `sold` 字段，需 `commerce:product:update`），
  并可为商品添加自定义评论（昵称/头像自设，需 `review:admin:marketing`）；
  营销评论无订单来源（orderId 为 NULL，唯一索引允许多个 NULL），与真实评论共用展示/显隐/删除/均分链路，
  C 端评论区展示头像（真实评论无头像时展示昵称首字占位）

## 结构导图

```
packages/contracts/src/review/review.ts      # REVIEW_LIMITS / SubmitReviewPayload / ReviewPublicView / AdminReviewView
apps/server/src/modules/review/
├── domain/                                  # 领域层
│   ├── review.entity.ts                     # 评论聚合根（orderId 唯一 = 一单一评，visible 软隐藏）
│   └── review-repository.interface.ts       # 仓储抽象（含平均分/已评订单集合查询）
├── infrastructure/
│   └── review.repository.ts                 # TypeORM 实现（租户过滤，AVG 聚合查询）
├── application/
│   ├── review.mapper.ts                     # 实体 → 公开视图（昵称脱敏）/ 管理端视图
│   └── use-cases/
│       ├── submit-review.usecase.ts         # 校验链通过后固化快照入库
│       ├── create-marketing-review.usecase.ts # 营销工具：管理端添加自定义评论（校验商品存在）
│       ├── list-product-reviews.usecase.ts  # 商品可见评论分页 + 平均分
│       ├── list-reviewed-orders.usecase.ts  # 给定订单集合中本人已评的订单 id
│       ├── list-admin-reviews.usecase.ts    # 管理端分页检索（星级/可见过滤）
│       ├── set-review-visibility.usecase.ts # 隐藏/恢复
│       └── remove-review.usecase.ts         # 硬删除
├── interfaces/
│   ├── dto/submit-review.dto.ts
│   ├── dto/create-marketing-review.dto.ts   # 营销评论入参（昵称/头像/星级/内容）
│   ├── dto/review-admin-list-query.dto.ts   # 分页 + 星级/可见过滤
│   ├── dto/set-review-visibility.dto.ts
│   ├── dto/reviewed-orders-query.dto.ts     # 逗号分隔订单 id 列表
│   └── controllers/                         # 一个路由一个文件
│       ├── review.public-list.controller.ts # GET    /review/public/product/:productId（公开）
│       ├── review.mine.reviewed.controller.ts # GET  /review/mine/reviewed
│       ├── review.submit.controller.ts      # POST   /review
│       ├── review.marketing.create.controller.ts # POST /review/marketing（review:admin:marketing）
│       ├── review.admin.list.controller.ts  # GET    /review（review:admin:list）
│       ├── review.visibility.controller.ts  # POST   /review/:id/visibility（review:admin:moderate）
│       └── review.remove.controller.ts      # DELETE /review/:id（review:admin:remove）
└── review.module.ts                         # 模块装配（静态路由先于 :id 注册）

apps/client/src/
├── api/review.api.ts                        # C 端评论接口封装
├── components/review/RatingStars.vue        # 星级组件（展示 + 可点选打分共用）
├── components/review/ReviewDialog.vue       # 订单评价弹层（与 PayDialog 同风格）
└── components/product/ProductReviews.vue    # 商品详情页评论区（自加载分页）

apps/web/src/
├── api/review.api.ts                        # 管理端评论接口封装
├── components/review/ReviewStats.vue        # 统计卡片（总数/展示中/已隐藏）
├── components/review/ReviewDirectory.vue    # 评论列表（过滤/星级/显隐/删除/分页，营销评论标识）
├── components/commerce/product/ProductMarketingDialog.vue # 营销工具弹窗（销量编辑 + 添加评论）
└── views/review/ReviewAdminView.vue(.css)   # 评论管理页（review:menu 菜单挂载）

复用的既有能力：
- order：OrderModule 导出的 ORDER_REPOSITORY 端口（订单归属/状态校验，不重复实现订单查询）
- commerce：CommerceModule 导出的 PRODUCT_REPOSITORY 端口（营销评论校验商品存在并固化标题快照）
- rbac：UserDirectory 批量解析评论人资料；权限码/菜单由播种器幂等补齐
```

## 关键设计

- **一单一评**：以 `orderId` 唯一索引为幂等键，业务层先查后插，数据库唯一约束兜底并发
- **快照固化**：评论保存 `orderNo` / `productTitle` 快照，与订单模块的商品快照思路一致
- **软隐藏 + 硬删除分离**：隐藏用于违规治理（可恢复、不影响用户已评状态）；删除彻底移除并放开重评
- **脱敏展示**：公开视图仅暴露脱敏昵称（如「小*明」），管理端才可见完整用户名/订单号
- **营销评论同链路**：自定义昵称/头像存在实体 `reviewer_name` / `avatar` 列（真实评论为空串），
  公开视图优先取自定义昵称，不另建表/接口，显隐、删除、平均分统计均自然覆盖

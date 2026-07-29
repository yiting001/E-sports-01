# 商品管理（Commerce）

## 模块职责

陪玩下单平台的商品与分类管理。运营在管理端维护「分类」（一级归类，如大红单/护航单）与「商品」（具体陪玩服务单，含标题、封面图片、封面标语、富文本详情、现价/原价、销量、关联负责客服、上下架状态、排序）；C 端（用户端 `apps/client`）通过免登录公开接口读取启用分类与上架商品。

实现的功能：

- **分类 CRUD**：管理端分页查询、创建、更新、删除；同租户下分类名唯一；删除时若分类下仍有商品则拒绝，避免商品失去归属。
- **分类图标（图片 / 文字两种形式）**：分类含图标图片 `icon`（走 `/upload`）与文字图标 `cover`。C 端分类页「综合」把分类名作为可配置大标题，优先展示图片图标，未设图片或加载失败则回退文字图标（`cover`，为空再取分类名前两字）。
- **商品 CRUD + 上下架**：管理端分页查询（按分类 / 状态 / 关键字过滤）、创建、更新、删除、上下架切换。新建商品默认「下架」，需显式上架后 C 端才可见。
- **封面图片 + 富文本详情**：商品含封面图片（`cover`，走现有 `/upload` 上传返回 URL）与富文本详情（`description` 存 HTML，管理端用 AiEditor 编辑，图片/视频复用上传接口）。C 端详情主图只展示封面，`coverTitle / coverSub` 在图下独立展示；富文本先净化再转换历史本机媒体地址。
- **关联负责客服（仅客服角色）**：商品可选关联一名「负责客服」（`serviceAgentId`，可空），为后续「下单拉群只拉指定客服」打基础。候选人**仅取拥有内置「客服」角色（`service`）的用户**（非全部用户），管理端表单经 `/commerce/service-agents` 按用户名/昵称远程搜索。客服角色由 `RbacSeeder` 幂等播种，管理员在用户管理中为客服人员分配。
- **C 端商品详情页视觉**：价格区采用战术金渐变面板（大号价格 + 折扣标签 + 划线原价 + 已售），封面底部渐隐衔接，下单按钮为斜切金色渐变；移动端与 PC 端（双栏 + 右侧吸顶信息卡）均适配。
- **C 端只读公开接口**：`/commerce/public/categories`（启用分类）、`/commerce/public/products`（上架商品，可按分类过滤）与 `/commerce/public/products/:id`（单个上架商品），免登录，供首页、分类和详情页渲染。
- **营销工具**：商品列表「营销」入口弹窗，可编辑已售销量（`sold` 走商品更新接口，需 `commerce:product:update`），并可为商品添加自定义评论（昵称/头像自设，走 `POST /review/marketing`，详见 `docs/review.md`）。
- **金额以「分」存储**：`priceFen` / `originPriceFen` 为整数分，杜绝浮点误差；展示层统一 `fenToYuan` 转元。

## 结构导图（DDD 四层）

```
modules/commerce/
├─ domain/
│  ├─ category.entity.ts                 分类聚合根（TenantScopedEntity：name/cover/sort/enabled）
│  ├─ product.entity.ts                  商品聚合根（categoryId/价格/销量/serviceAgentId/status/sort）
│  ├─ category-repository.interface.ts   分类仓储端口（CATEGORY_REPOSITORY）
│  └─ product-repository.interface.ts    商品仓储端口（PRODUCT_REPOSITORY，含 ProductFilter）
├─ application/
│  ├─ category.mapper.ts                 分类实体 → 管理端/ C 端视图
│  ├─ product.mapper.ts                  商品实体 → 管理端/ C 端视图
│  ├─ product-view.assembler.ts          单商品视图组装（解析分类名 + 负责客服名，供写用例复用）
│  └─ use-cases/                         分类：list/create/update/remove/list-public
│                                        商品：list/create/update/remove/publish/list-public
│                                        客服候选：list-service-agents
├─ infrastructure/
│  ├─ category.repository.ts             TypeORM 实现（按租户过滤；countProducts 聚合各分类商品数）
│  └─ product.repository.ts              TypeORM 实现（按租户过滤；分类/状态/关键字过滤）
└─ interfaces/
   ├─ dto/                               create/update-category、create/update-product、
   │                                     publish、product-list-query、public-product-query
   └─ controllers/                       一路由一文件（分类 4 + 商品 5 + 客服 1 + 公开 2）
```

前端：
- 管理端 `apps/web/src/views/commerce/CategoryListView.vue`（菜单 `commerce:category:menu`）、`ProductListView.vue`（菜单 `commerce:product:menu`）只负责数据加载、提交、删除、上下架等业务编排；UI 拆到 `apps/web/src/components/commerce/`：
  - `category/CategoryStats.vue`、`CategoryDirectory.vue`、`CategoryFormDrawer.vue`
  - `product/ProductStats.vue`、`ProductDirectory.vue`、`ProductFormDrawer.vue`
  - `commerce-ui.types.ts` 收口分类/商品表单与筛选模型
- 管理端 API 门面：`apps/web/src/api/commerce.api.ts`。
- 用户端 `apps/client`：`views/home/HomeView.vue`（分类签 + 商品网格）、`views/category/CategoryView.vue`（分类大标题 + 商品明细 / 销量榜）、`views/product/ProductDetailView.vue`（主图 / 介绍 / 保障 / 富文本）接入公开接口，API 门面 `apps/client/src/api/commerce.api.ts`；分类卡和榜单条目分别由 `CategoryGroupCard.vue`、`RankItemCard.vue` 承载，共用 `ProductCoverThumb.vue`。

## 权限（RBAC）

| 权限码 | 名称 | 守卫接口 |
| --- | --- | --- |
| `commerce:category:menu` | 分类管理（菜单） | 前端动态路由 `/commerce/categories` |
| `commerce:product:menu` | 商品管理（菜单） | 前端动态路由 `/commerce/products` |
| `commerce:category:list` | 分类-查询 | `GET /commerce/categories` |
| `commerce:category:create` | 分类-创建 | `POST /commerce/categories` |
| `commerce:category:update` | 分类-更新 | `PATCH /commerce/categories/:id` |
| `commerce:category:remove` | 分类-删除 | `DELETE /commerce/categories/:id` |
| `commerce:product:list` | 商品-查询 | `GET /commerce/products`、`GET /commerce/service-agents` |
| `commerce:product:create` | 商品-创建 | `POST /commerce/products` |
| `commerce:product:update` | 商品-更新 | `PATCH /commerce/products/:id` |
| `commerce:product:remove` | 商品-删除 | `DELETE /commerce/products/:id` |
| `commerce:product:publish` | 商品-上下架 | `PATCH /commerce/products/:id/status` |

> 管理类接口默认仅超管；其余角色在「角色管理」按需分配。菜单权限由 `MENU_DEFINITIONS` 单一来源经 `RbacSeeder` 幂等播种。

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/commerce/categories` | `commerce:category:list` | 分页 `?page&pageSize`，含各分类商品数 |
| POST | `/commerce/categories` | `commerce:category:create` | `{ name, cover?, sort?, enabled? }` |
| PATCH | `/commerce/categories/:id` | `commerce:category:update` | 部分更新 |
| DELETE | `/commerce/categories/:id` | `commerce:category:remove` | 分类下有商品则拒绝 |
| GET | `/commerce/products` | `commerce:product:list` | 分页 `?page&pageSize&categoryId&status&keyword` |
| POST | `/commerce/products` | `commerce:product:create` | 创建，默认下架 |
| PATCH | `/commerce/products/:id` | `commerce:product:update` | 部分更新 |
| PATCH | `/commerce/products/:id/status` | `commerce:product:publish` | `{ status: on_shelf \| off_shelf }` |
| DELETE | `/commerce/products/:id` | `commerce:product:remove` | 删除 |
| GET | `/commerce/service-agents` | `commerce:product:list` | 负责客服候选 `?page&pageSize&keyword` |
| GET | `/commerce/public/categories` | 公开 | 启用中的分类（C 端） |
| GET | `/commerce/public/products` | 公开 | 上架商品分页 `?page&pageSize&categoryId&keyword` |
| GET | `/commerce/public/products/:id` | 公开 | 单个上架商品详情；不存在或下架均返回 404 |

## C 端分类目录

`/category` 保留「综合 / 排行榜」双模式。综合模式按公开分类顺序输出分组，每个分类名称就是管理端可维护的大标题，组内显示真实商品封面、主副标语、价格和销量；排行榜将已加载商品按销量降序取前 10 项，正文进入详情，主按钮进入既有下单流程。

```mermaid
flowchart LR
  Admin["管理端分类 / 商品维护"] --> CategoryAPI["公开启用分类"]
  Admin --> ProductAPI["公开上架商品分页"]
  CategoryAPI --> Catalog["综合分类目录"]
  ProductAPI --> Catalog
  ProductAPI --> Rank["销量排行榜"]
  Catalog --> Detail["商品详情"]
  Rank --> Detail
  Rank --> Checkout["下单"]
```

- 分类页首先并发读取分类与商品第一页，若总数超过 100 则按总页数继续读取，合并时按商品 ID 去重并只保留归属启用分类的商品；任一请求失败进入可重试错误态。
- 启用但暂无上架商品的分类仍展示空态；无分类与无排行榜商品使用不同文案。
- 综合缩略图为稳定 `68px` 方形，排行榜桌面 / 移动分别为 `72px / 64px`，均使用 `object-fit: cover`；图片失败回退封面文字，分类 / 商品长标题均截断，不改变卡片尺寸。
- 综合与排行榜都渲染真实商品图片，并分别展示 `coverTitle` 与 `coverSub`，不会因存在副标语而隐藏主标语。
- 桌面综合为两列分组、榜单为单列；小于 `768px` 后统一单列，固定底部导航仍由 `MainLayout` 负责留白。
- 本次只调整 C 端展示与状态编排，不改变分类 / 商品契约、公开 API、RBAC、管理端表单或数据库结构。

## 设计要点（无硬编码 / 最小化）

- **上下架单一枚举**：`ProductStatus`（`on_shelf` / `off_shelf`）在 `@app/contracts`，C 端公开查询强制只返回 `on_shelf`，前后端同源。
- **金额以分为单位**：整数存储，展示层 `fenToYuan` 转换，禁止前端自算浮点。
- **多租户**：两个实体继承 `TenantScopedEntity`，仓储经 `withTenant` / `applyTenant` 行级隔离。
- **视图组装收口**：`ProductViewAssembler` 统一「实体 → 视图」时的分类名、负责客服名解析，创建/更新/上下架用例复用，避免重复拼装；列表用例批量解析（`findByIds` + `resolveProfiles`）避免 N+1。
- **契约共享**：`CategoryView`、`ProductView`、`ProductPublicView`、`CreateProductPayload` 等在 `@app/contracts`，管理端与用户端复用同一类型定义。
- **表结构**：经 TypeORM `synchronize` 自动建立，随实体演进，无需手写迁移。

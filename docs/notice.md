# 运营通知与首页横幅（notice）

## 实现了什么

1. **首页横幅**：C 端首页顶部横幅改为后台可编辑的单张图片——管理端上传图片保存后即时生效；未配置时 C 端不展示横幅。图片 URL 存于配置中心 `portal.homeBanner`（Image 类型，「运营」组），不新增表。
2. **通知公告**：管理端维护通知（标题 + 富文本详情 + 启停 + 排序）；C 端首页公告条滚动展示启用中的通知标题，点击进入通知列表/详情页（免登录可读）；无启用通知时公告条不渲染。
3. **管理端「运营通知」菜单页**：首页横幅设置面板 + 通知 CRUD（表格行内启停、编辑弹窗内置富文本编辑器，支持插图/视频）。

## 结构导图

```
packages/contracts/src/notice/notice.ts     # NoticeView / NoticePublicView / UpsertNoticePayload / PortalBannerView / NOTICE_LIMITS
apps/server/src/modules/notice/
├── domain/
│   ├── notice.entity.ts                    # 通知聚合根（title/content/enabled/sort，租户隔离）
│   └── notice-repository.interface.ts      # 仓储端口 + 注入令牌
├── infrastructure/
│   └── notice.repository.ts                # TypeORM 实现（租户过滤、sort 升序 + createdAt 倒序）
├── application/
│   ├── notice.mapper.ts                    # 实体 → 管理端/公开视图
│   └── use-cases/                          # 列表/保存/删除/公开列表/公开详情/横幅读/横幅写（一用例一文件）
├── interfaces/
│   ├── dto/                                # UpsertNoticeDto / UpdateBannerDto
│   └── controllers/                        # 一路由一文件（静态路由控制器注册在 :id 之前）
└── notice.module.ts

apps/client/src/
├── api/notice.api.ts                       # 公开接口客户端（横幅/通知列表/详情）
├── components/home/HomeBanner.vue          # 配了图展示图片，未配置不渲染
├── components/home/NoticeBar.vue           # 滚动展示启用通知标题（无通知不渲染），点击进列表/详情
└── views/notice/                           # NoticeListView / NoticeDetailView（DOMPurify 净化富文本）

apps/web/src/
├── api/notice.api.ts                       # 管理端 CRUD + 横幅读写
├── components/notice/BannerPanel.vue       # 横幅上传/撤下
├── components/notice/NoticeFormDialog.vue  # 新建/编辑弹窗（富文本）
└── views/notice/NoticeAdminView.vue        # 「运营通知」菜单页
```

## REST 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/notice/banner` | 公开 | 读取首页横幅图片 `{ image }`（未配置为空串） |
| PUT | `/api/notice/banner` | `notice:banner` | 更新横幅 `{ image }`，传空串即撤下 |
| GET | `/api/notice/public` | 公开 | 启用中的通知列表（sort 升序 + 创建时间倒序） |
| GET | `/api/notice/public/:id` | 公开 | 单条通知详情（仅启用中的可见） |
| GET | `/api/notice` | `notice:list` | 管理端分页列表 `?page&pageSize` |
| POST | `/api/notice` | `notice:save` | 新建通知 `{ title, content, enabled, sort }` |
| PUT | `/api/notice/:id` | `notice:save` | 编辑通知 |
| DELETE | `/api/notice/:id` | `notice:remove` | 删除通知 |

## 权限与菜单

- 权限码：`notice:list` / `notice:save` / `notice:remove` / `notice:banner`（播种为 api 权限，超管默认拥有）。
- 菜单：`notice:menu`「运营通知」（system 组，需在角色菜单授权后可见）。

## 设计要点

- 横幅本质是一个可调参数（一张图），复用配置中心（含 Redis 读穿缓存与默认值播种）而非新建表，避免重复设施。
- 公开只读接口沿用 `@Public()` + `/public` 路径的既有模式（同 commerce 公开商品）。
- C 端富文本详情经 DOMPurify 净化后渲染，防 XSS；管理端富文本编辑复用既有 AiEditor 封装。

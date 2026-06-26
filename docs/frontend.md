# 前端基座（Vue3 + Pinia）

## 模块职责

Vue3 + Pinia + Element Plus 前端基座，提供：登录鉴权、基于权限的**动态路由与菜单**、
**按钮级 `v-permission` 指令**、统一 axios 封装（401 静默刷新）、WebSocket IM 接入。

实现的功能：

- **鉴权 store**（Pinia）：登录/登出、拉取 profile、维护扁平权限码集合，`hasPermission()` 超管放行。
- **动态路由 + 守卫**：路由 `meta.permission` 声明所需权限，全局 `beforeEach` 守卫强制鉴权 + 鉴权。
- **菜单过滤**：按当前用户权限渲染可见菜单。
- **v-permission 指令**：无权限时直接从 DOM 移除元素（按钮级鉴权）。
- **HTTP 封装**：响应拦截层解包 `ApiResponse`，401 自动用 refresh 令牌静默刷新并重放请求。
- **IM 接入**：`use-im-socket` 组合式函数封装 Socket.IO 连接/收发。

## 目录结构

```
apps/web/src/
├── api/
│   ├── http.ts             axios 实例（请求注入令牌 / 响应解包 / 401 刷新）
│   ├── token-storage.ts    localStorage 令牌读写（infra.accessToken/refreshToken）
│   └── {auth,user,role,permission,config,upload,im}.api.ts  各模块请求函数
├── stores/auth.store.ts    鉴权状态（login/logout/profile/hasPermission）
├── router/
│   ├── routes.ts           路由表（含 meta.permission）
│   ├── guard.ts            全局前置守卫
│   └── index.ts            路由装配
├── directives/permission.directive.ts   v-permission 指令
├── composables/
│   ├── use-menus.ts        按权限过滤菜单
│   └── use-im-socket.ts    Socket.IO 组合式封装
├── layouts/AppLayout.vue   带侧边栏的主框架
├── views/                  Login / Dashboard / rbac / config / upload / im
├── config/env.ts           前端运行时配置（API base、WS URL）
├── App.vue
└── main.ts                 Pinia + Router + Element Plus + v-permission 装配
```

## 鉴权数据流

```mermaid
flowchart TB
  Login[LoginView] -->|login| Store[auth.store]
  Store -->|POST /auth/login| HTTP[http 封装]
  HTTP --> TS[token-storage]
  Store -->|GET /auth/profile| HTTP
  Store -->|isSuper + permissions Set| Consumers

  subgraph Consumers[三处统一消费点]
    Guard[router guard]
    Dir[v-permission 指令]
    Menu[use-menus 菜单过滤]
  end

  Guard -->|hasPermission meta.permission| Route[放行/重定向]
  Dir -->|无权限| Remove[移除 DOM 元素]
  Menu -->|过滤| Sidebar[侧边栏菜单]
```

`hasPermission(code)` 是唯一判定入口：`profile.isSuper === true || permissions.has(code)`。
超管后端走 bypass、显式权限为空，前端据 `isSuper` 字段直接放行，三处消费点行为一致。

## 路由守卫

```mermaid
sequenceDiagram
  participant N as 导航
  participant G as beforeEach 守卫
  participant S as auth.store

  N->>G: to / from
  alt 目标是登录页
    G-->>N: 已登录则重定向首页，否则放行
  else 受保护页
    alt 未登录
      G-->>N: 重定向 /login
    else 已登录但 profile 未加载
      G->>S: ensureProfile()
    end
    alt meta.permission 且 !hasPermission
      G-->>N: 重定向首页/403
    else
      G-->>N: 放行
    end
  end
```

## HTTP 401 静默刷新

```mermaid
sequenceDiagram
  participant V as 视图
  participant H as http 拦截器
  participant API as 后端

  V->>H: 业务请求(注入 access)
  H->>API: 请求
  API-->>H: 401
  H->>API: POST /auth/refresh (refresh 令牌)
  alt 刷新成功
    API-->>H: 新 access/refresh
    H->>H: 更新 token-storage
    H->>API: 重放原请求
    API-->>V: 业务数据(解包后)
  else 刷新失败
    H->>V: 清除令牌 + 跳转登录
  end
```

## 角色管理：编辑与权限分配

`RoleListView` 在「新建/删除」之外补齐了角色的两类编辑能力，按钮均受细粒度权限码控制：

| 操作 | 入口按钮 | 权限码 | 调用接口 |
| --- | --- | --- | --- |
| 编辑信息 | 编辑 | `rbac:role:update` | `PATCH /rbac/roles/:id`（仅改名称/备注，编码不可改） |
| 分配权限 | 分配权限 | `rbac:role:assignPermissions` | `POST /rbac/roles/:id/permissions` |

```mermaid
flowchart LR
  Row[角色行] -->|编辑| Form[新建/编辑双模式弹窗]
  Form -->|update| API1[PATCH /rbac/roles/:id]
  Row -->|分配权限| Dlg[RolePermissionDialog]
  Dlg -->|权限树回显勾选| Tree[el-tree show-checkbox]
  Tree -->|getCheckedKeys + 半选| API2[POST /rbac/roles/:id/permissions]
  API2 -->|清空鉴权缓存| Effect[即时生效]
```

- 新建与编辑复用同一弹窗（`editingId` 区分模式），编辑态下编码字段禁用，与后端 `UpdateRoleDto` 一致。
- 权限分配拆为独立组件 `components/rbac/RolePermissionDialog.vue`：打开时拉取权限树并按 `role.permissionIds` 回显勾选，保存时收集全选 + 半选节点，后端落库后清空鉴权缓存即时生效。

## 设计要点

- **单一判定入口**：所有鉴权收敛到 `hasPermission`，避免分散判断逻辑漂移。
- **响应解包在拦截层**：视图直接拿 `data`，无需层层 `res.data.data`。
- **令牌存储集中**：`token-storage` 统一键名（`infra.accessToken` / `infra.refreshToken`）。
- **权限码共享**：路由 `meta.permission` 与指令复用 contracts 的 `PERMS`，与后端同源。

## 视图清单

| 路由 | 视图 | 所需权限 |
| --- | --- | --- |
| `/login` | LoginView | 公开 |
| `/` | DashboardView | 登录即可 |
| `/rbac/users` | UserListView | `rbac:user:list` |
| `/rbac/roles` | RoleListView | `rbac:role:list` |
| `/rbac/permissions` | PermissionListView | `rbac:permission:list` |
| `/config` | ConfigView | `config:list` |
| `/upload` | UploadView | `upload:file:list` |
| `/im` | ImView | `im:message:history` |

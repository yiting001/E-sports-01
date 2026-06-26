# API 参考

全局前缀 `/api`。除标注 **公开** 外，所有端点需在请求头携带 `Authorization: Bearer <accessToken>`，
并满足对应的权限码（超管自动放行）。响应统一包装为 `ApiResponse<T>`：

```jsonc
{ "code": 0, "message": "ok", "data": <T>, "timestamp": 1782447482340 }
```

分页结果统一形如 `{ list, total, page, pageSize }`；分页查询入参 `?page=1&pageSize=10`。

## 认证（公开 / 鉴权）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | 注册用户 |
| POST | `/api/auth/login` | 公开 | 登录，返回 `{ accessToken, refreshToken }` |
| POST | `/api/auth/refresh` | 公开 | 用 refresh 令牌换发新双令牌 |
| GET | `/api/auth/profile` | 登录 | 当前用户 `{ id, username, nickname, roles[], permissions[], isSuper }` |

```jsonc
// POST /api/auth/login  请求
{ "username": "admin", "password": "admin123456" }
// data
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```

## RBAC 权限

### 用户

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/users` | `rbac:user:list` |
| POST | `/api/rbac/users` | `rbac:user:create` |
| PATCH | `/api/rbac/users/:id` | `rbac:user:update` |
| DELETE | `/api/rbac/users/:id` | `rbac:user:remove` |
| POST | `/api/rbac/users/:id/roles` | `rbac:user:assignRoles` |

### 角色

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/roles` | `rbac:role:list` |
| POST | `/api/rbac/roles` | `rbac:role:create` |
| PATCH | `/api/rbac/roles/:id` | `rbac:role:update` |
| DELETE | `/api/rbac/roles/:id` | `rbac:role:remove` |
| POST | `/api/rbac/roles/:id/permissions` | `rbac:role:assignPermissions` |

### 权限

| 方法 | 路径 | 权限码 |
| --- | --- | --- |
| GET | `/api/rbac/permissions` | `rbac:permission:list` |
| POST | `/api/rbac/permissions` | `rbac:permission:create` |
| PATCH | `/api/rbac/permissions/:id` | `rbac:permission:update` |
| DELETE | `/api/rbac/permissions/:id` | `rbac:permission:remove` |

## 配置中心

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/config` | `config:list` | 列表（密钥项值脱敏 `******`） |
| POST | `/api/config` | `config:save` | 新增/更新（upsert），写后失效缓存 |
| DELETE | `/api/config/:key` | `config:remove` | 删除并失效缓存 |

```jsonc
// POST /api/config 请求
{ "key": "upload.driver", "value": "oss", "type": "string", "group": "upload", "remark": "存储驱动" }
```

## 文件上传

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/upload` | `upload:file:upload` | multipart 上传，返回元数据 + URL |
| GET | `/api/upload/files` | `upload:file:list` | 分页列表 |
| DELETE | `/api/upload/files/:id` | `upload:file:remove` | 删对象 + 删记录，204 |

静态访问：本地驱动文件经 `upload.localBaseUrl`（默认 `http://127.0.0.1:3000/static`）对外提供。

## WebSocket IM

REST：

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/im/messages` | `im:message:history` | 拉取会话历史（`?conversationId=`，条数默认 `im.historyLimit`） |

WebSocket（命名空间 `/im`，握手携带 access 令牌）：

| 事件 | 方向 | 载荷 |
| --- | --- | --- |
| `im:join` | C→S | `conversationId: string` → 返回 `ChatMessage[]` |
| `im:joined` | S→C | `{ conversationId }` |
| `im:send` | C→S | `{ conversationId, type, content }` |
| `im:receive` | S→C | `ChatMessage` |
| `im:error` | S→C | `{ message }` |

## Observability 日志

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/observability/logs` | `observability:log:list` | 分页查询，`?page&pageSize&level&type&traceId&path&userId&startTime&endTime` |
| GET | `/api/observability/logs/trace/:traceId` | `observability:log:detail` | 按 traceId 还原全链路日志 |
| DELETE | `/api/observability/logs` | `observability:log:purge` | 清理过期日志，body `{ days? }`（缺省取 `log.retentionDays`） |

所有响应均带 `x-trace-id` 头，可用于到日志中检索本次请求全链路。

## 权限码一览（contracts `PERMS`）

| 模块 | 权限码 |
| --- | --- |
| 配置 | `config:list` `config:save` `config:remove` |
| 用户 | `rbac:user:list` `rbac:user:create` `rbac:user:update` `rbac:user:remove` `rbac:user:assignRoles` |
| 角色 | `rbac:role:list` `rbac:role:create` `rbac:role:update` `rbac:role:remove` `rbac:role:assignPermissions` |
| 权限 | `rbac:permission:list` `rbac:permission:create` `rbac:permission:update` `rbac:permission:remove` |
| 文件 | `upload:file:upload` `upload:file:list` `upload:file:remove` |
| IM | `im:message:history` |
| 日志 | `observability:log:list` `observability:log:detail` `observability:log:purge` |

## 业务状态码（`BizCode`）

| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 失败 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 不存在 |
| 500 | 服务器错误 |

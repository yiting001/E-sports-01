# 配置中心（Config Center）

## 模块职责

平台**唯一的可调参数登记处**。除数据库/Redis 连接信息与部署密钥（这些走 `.env`）外，
所有业务可调参数（令牌有效期、上传驱动、OSS 凭证、IM 历史条数等）全部入库，
其它模块只通过 `ConfigService` 读取，从根本上消除散落各处的硬编码常量。

实现的功能：

- 启动时按默认清单**播种**缺失的配置项（幂等，已存在则跳过）。
- 配置项**列表查询**（密钥类配置值脱敏返回 `******`）。
- 配置项**新增/更新**（upsert）并失效缓存。
- 配置项**删除**并失效缓存。
- 统一**读穿透缓存**（Redis，TTL 300s），并按类型（string/number/boolean/json/richtext/image）安全读取，缓存不可用时降级回源。
- **富文本配置（richtext）**：值为 HTML 字符串（读取等同 string），配置中心编辑时启用富文本编辑器（AiEditor，图片/视频走 `POST /upload` 返回 URL），渲染前经 DOMPurify 净化防 XSS。如 `im.service.welcome`。
- **图片配置（image）**：值为图片上传后的可访问 URL（读取等同 string），配置中心编辑时用图片上传控件（走 `POST /upload` 返回 URL）并预览。如软件图标 `system.appLogo`。
- **品牌信息**：`system.appName`（软件名称）与 `system.appLogo`（软件图标）可在配置中心修改，并经公开接口 `GET /config/branding` 在登录前下发给前端，用于浏览器标题、favicon、登录页与侧边栏 logo。
- **历史迁移（幂等）**：`im.service.welcome` 由 string 改为 richtext 仅纠正类型、保留已编辑内容；`upload.maxFileSize` 旧字节默认值迁移为 MB。

## 目录结构（DDD 四层）

```
modules/config/
├── domain/
│   ├── config-item.entity.ts           配置项实体（key/value/type/group/remark/secret）
│   ├── config-repository.interface.ts  仓储端口 + 注入令牌
│   └── config-defaults.ts              默认配置清单（默认值唯一来源）
├── application/
│   ├── config.service.ts               读取服务（Redis 读穿透缓存 + 类型化读取）
│   ├── config.mapper.ts                实体 ↔ DTO（含密钥脱敏）
│   └── use-cases/
│       ├── list-configs.usecase.ts
│       ├── upsert-config.usecase.ts
│       └── remove-config.usecase.ts
├── infrastructure/
│   ├── config.repository.ts            TypeORM 仓储实现
│   └── config.seeder.ts                启动播种器（OnApplicationBootstrap）
└── interfaces/
    ├── dto/upsert-config.dto.ts
    ├── list-configs.controller.ts      GET    /api/config
    ├── upsert-config.controller.ts     POST   /api/config
    └── remove-config.controller.ts     DELETE /api/config/:key
```

## 结构与依赖

```mermaid
flowchart TB
  subgraph interfaces
    LC[list-configs.controller]
    UC[upsert-config.controller]
    RC[remove-config.controller]
  end
  subgraph application
    LU[list-configs.usecase]
    UU[upsert-config.usecase]
    RU[remove-config.usecase]
    CS[ConfigService]
    MP[config.mapper]
  end
  subgraph domain
    ENT[ConfigItem 实体]
    REPOI[[ConfigRepository 端口]]
    DEF[DEFAULT_CONFIGS 默认清单]
  end
  subgraph infrastructure
    REPO[config.repository]
    SEED[config.seeder]
  end

  LC --> LU --> REPOI
  UC --> UU --> REPOI
  RC --> RU --> REPOI
  LU --> MP
  UU --> CS
  RU --> CS
  REPO -. 实现 .-> REPOI
  SEED --> DEF
  SEED --> REPOI
  CS --> REPOI
  CS --> RD[(Redis)]
  REPO --> PG[(PostgreSQL)]
```

## 读取缓存流程（读穿透）

```mermaid
sequenceDiagram
  participant M as 业务模块
  participant CS as ConfigService
  participant RD as Redis
  participant DB as PostgreSQL

  M->>CS: getNumber(key, fallback)
  CS->>RD: GET config:key
  alt 命中
    RD-->>CS: 值
  else 未命中 / 缓存不可用
    CS->>DB: findByKey(key)
    DB-->>CS: ConfigItem | null
    CS->>RD: SET config:key 值 EX 300（失败忽略）
  end
  CS-->>M: 解析为目标类型，缺失则返回 fallback
```

写操作（upsert/remove）完成后调用 `ConfigService.invalidate(key)` 删除缓存，下次读取回源，保证一致性。

## 默认配置清单

| key | 分组 | 默认值 | 说明 | 密钥 |
| --- | --- | --- | --- | --- |
| `system.appName` | System | `基础设施平台` | 软件名称（标题/登录页/侧边栏） | |
| `system.appLogo` | System | （空） | 软件图标（image，作 logo 与 favicon） | |
| `auth.accessTokenTtl` | Auth | `3600` | 访问令牌有效期（秒） | |
| `auth.refreshTokenTtl` | Auth | `604800` | 刷新令牌有效期（秒） | |
| `upload.driver` | Upload | `local` | 存储驱动 local/oss | |
| `upload.maxFileSize` | Upload | `10` | 单文件最大体积（MB） | |
| `upload.localBaseUrl` | Upload | `http://127.0.0.1:3000/static` | 本地存储访问基础 URL | |
| `upload.localDir` | Upload | `uploads` | 本地存储根目录 | |
| `upload.ossEndpoint` | Upload | （空） | OSS Endpoint | |
| `upload.ossBucket` | Upload | （空） | OSS Bucket | |
| `upload.ossAccessKeyId` | Upload | （空） | OSS AccessKeyId | ✓ |
| `upload.ossAccessKeySecret` | Upload | （空） | OSS AccessKeySecret | ✓ |
| `im.historyLimit` | Im | `50` | 拉取历史消息默认条数 | |
| `sms.provider` | Sms | `log` | 短信服务商 aliyun/tencent/volcano/log | |
| `sms.code.length` | Sms | `6` | 验证码位数 | |
| `sms.code.ttl` | Sms | `300` | 验证码有效期（秒） | |
| `sms.code.sendInterval` | Sms | `60` | 同号两次发送最小间隔（秒） | |
| `sms.countryCode` | Sms | `+86` | 国际区号（E.164） | |
| `sms.aliyun.accessKeyId` / `accessKeySecret` | Sms | （空） | 阿里云凭证 | ✓ |
| `sms.aliyun.signName` / `templateCode` / `endpoint` | Sms | — | 阿里云签名/模板/Endpoint | |
| `sms.tencent.secretId` / `secretKey` | Sms | （空） | 腾讯云凭证 | ✓ |
| `sms.tencent.sdkAppId` / `signName` / `templateId` / `region` | Sms | — | 腾讯云应用/签名/模板/地域 | |
| `sms.volcano.accessKeyId` / `secretAccessKey` | Sms | （空） | 火山引擎凭证 | ✓ |
| `sms.volcano.smsAccount` / `signName` / `templateId` / `region` | Sms | — | 火山引擎账号/签名/模板/地域 | |

> 标记为密钥（`secret: true`）的配置项，列表查询时值会被脱敏为 `******`，不会明文返回前端。短信详见 [sms.md](./sms.md)。

## 设计要点

- **读穿透缓存 + 降级**：Redis 不可用时 `safeCacheGet/Set` 静默降级回源，不影响主流程。
- **类型安全读取**：`getString/getNumber/getBoolean/getJson` 均带 fallback，非法值回退默认，避免脏数据击穿业务。
- **默认值唯一来源**：`DEFAULT_CONFIGS` 是默认值的唯一登记处，播种器据此初始化，杜绝重复定义。

## 相关端点

详见 [api-reference.md](./api-reference.md#配置中心)。

## 前端配置中心页

`/config` 是配置中心的页面容器，只编排现有 `configApi` 和表单状态；
展示组件通过 props 接收列表、统计和表单数据，通过事件把新增、编辑、删除和保存交回页面容器处理。

已实现能力：

- 配置总数、覆盖分组、敏感配置、富文本配置四类概览。
- 配置目录保持表格视图，窄屏通过 `AppDataTable` 横向滚动。
- 配置目录支持按配置键、分组、类型、备注和非敏感值快速搜索，敏感值不参与前端明文匹配。
- 敏感项列表脱敏展示，编辑敏感项时不回填原值。
- 富文本配置继续按需加载 `RichTextEditor`，列表预览仍先经 `sanitizeHtml` 净化。
- 新增/编辑弹窗维护 key、value、type、group、remark、secret。
- 按钮权限继续沿用 `v-permission`，接口调用仍复用 `configApi`。

```mermaid
flowchart TD
  Page["ConfigView.vue 页面容器"] --> Hero["ConfigHero 头部视觉"]
  Page --> Stats["ConfigStats 指标概览"]
  Page --> Directory["ConfigDirectory 配置目录"]
  Page --> FormDialog["ConfigFormDialog 新增/编辑弹窗"]
  Directory --> ConfigApi["configApi.list/upsert/remove"]
  FormDialog --> RichText["RichTextEditor 按需加载"]
  Directory --> Sanitize["sanitizeHtml 富文本预览净化"]
```

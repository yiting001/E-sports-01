# 主题特效（Canvas UI 背景特效）

## 功能目标

- 管理端按租户配置 C 端启用的全站背景特效（可多选同时启用，空即全部关闭）。
- C 端首次进入按租户编码拉取配置，用启用的特效组件逐层包裹页面内容渲染。
- 多租户隔离：管理端读写走登录租户上下文；C 端公开接口按显式租户编码解析。

## 已实现能力

- 5 个 [Canvas UI](https://canvasui.dev) 特效（Vue 版源码按官方实现落库于 `apps/client/src/components/canvasui/`）：
  - `clouds` 云雾漂浮、`blaze` 底部火焰、`laser` 激光扫描、`grid` 3D 瓷砖波纹；
  - `frost` 冰霜覆盖页面，光标划过时融化并留下轨迹，随后逐渐重新冻结。
- 服务端 `theme` 模块（DDD 四层）+ 建表 migration `AddThemeEffectSetting1785800000000`。
- 管理端「主题特效」菜单页（勾选保存，权限 `theme:effects:list` / `theme:effects:save`）。
- C 端 `ThemeEffectLayer` 挂在 `MainLayout`，特效组件按需懒加载，不进入首屏包。
- 五个 C 端特效统一忽略 Vue 可选 props 中的 `undefined`，初次创建和运行时更新均不会覆盖组件默认参数。

## 非目标

- 未提供每个特效的参数（颜色/强度等）可视化调参；当前使用组件默认参数。
- 未注册 Chrome Origin Trial；生产域名如需免开关生效，需自行注册并下发 token。

## 浏览器兼容与降级

特效基于 Chrome html-in-canvas API：本地体验需开启 `chrome://flags/#canvas-draw-element`；
生产可为域名注册 Chrome Origin Trial 免开关生效。不支持该 API 时，页面内容仍按普通
HTML 渲染，特效退化为不采样页面内容的透明覆盖层；WebGL2 也不可用时完全关闭特效，
两种情况都不影响页面交互。

## 目录结构

```text
apps/server/src/modules/theme/
├── domain/          theme-setting.entity.ts（每租户至多一条，effects 存 JSON 数组文本）
│                    theme-setting-repository.interface.ts
├── application/     theme.mapper.ts（JSON 解析 + sanitizeThemeEffects 安全回退）
│                    use-cases/（管理端读/写、C 端公开读）
├── infrastructure/  theme-setting.repository.ts（管理端按租户上下文过滤）
└── interfaces/      controllers/（公开 GET、管理 GET/PUT）、dto/
```

共享契约：`packages/contracts/src/theme/theme.ts`（`ThemeEffect` 枚举、
`THEME_EFFECT_OPTIONS` 选项、`sanitizeThemeEffects` 清洗函数）。

```text
apps/client/src/components/
├── theme/           ThemeEffectLayer.vue（拉取配置并懒加载）、ThemeEffectNest.vue（递归嵌套）
└── canvasui/        Clouds.vue、Blaze.vue、Laser.vue、Grid.vue、Frost.vue
                     canvas-options.ts（仅合并值不为 undefined 的参数）
                     frost-*.ts（Frost 选项、画布捕获、着色器、WebGL 资源与运行时）
```

## 模块结构图

```mermaid
graph LR
  A[管理端 ThemeAdminView] -->|GET/PUT /theme/admin/effects| B[theme 模块]
  C[C 端 ThemeEffectLayer] -->|GET /theme/effects?tenantCode=| B
  B --> D[(theme_effect_setting)]
  C --> E[canvasui 特效组件<br/>懒加载嵌套包裹页面]
```

## 业务时序

```mermaid
sequenceDiagram
  participant C as C 端 MainLayout
  participant S as 服务端 theme 模块
  participant DB as theme_effect_setting
  C->>S: GET /theme/effects?tenantCode=xxx（免登录）
  S->>S: TenantResolver 解析租户（缺省默认租户）
  S->>DB: 按 tenant_id 查配置
  DB-->>S: effects JSON
  S-->>C: { effects: ["clouds","frost"] }
  C->>C: 懒加载对应组件并自外向内嵌套包裹页面内容
```

## 数据模型

`theme_effect_setting`：BaseEntity 审计字段 + `tenant_id`（索引）+ `effects text default '[]'`。
每租户至多一条，管理端保存为整量覆盖（upsert）。

## API 与权限

| 接口 | 权限 | 说明 |
| --- | --- | --- |
| `GET /theme/effects?tenantCode=` | 公开 | C 端读取本租户启用特效；租户编码经 TenantResolver 显式解析，缺省落默认租户，杜绝跨租户下发 |
| `GET /theme/admin/effects` | `theme:effects:list` | 管理端读当前租户配置 |
| `PUT /theme/admin/effects` | `theme:effects:save` | 整量覆盖；DTO 按枚举逐项校验，用例再经 sanitize 去重 |

## 异常与降级

- 配置缺失、JSON 损坏或含非法值：`sanitizeThemeEffects` 安全回退（过滤/空列表）。
- C 端接口失败：`ThemeEffectLayer` 静默降级为直接渲染内容。
- 浏览器不支持 html-in-canvas：内容按普通 HTML 渲染，特效使用不采样内容的透明覆盖层；
  WebGL2 也不可用时完全关闭特效。
- 可选参数未传或值为 `undefined`：保留默认值；显式 `0` 等有效值仍正常生效，避免颜色数组访问时运行时崩溃。

## 测试与验证

- 单测 `apps/server/test/theme/theme-effects.spec.ts`：清洗过滤/去重、JSON 损坏回退、
  公开接口租户解析（缺省默认租户/显式租户）、更新用例整量覆盖持久化。
- C 端单测 `apps/client/src/components/canvasui/canvas-options.spec.ts`：覆盖五个特效的无参数默认颜色、
  `undefined` 过滤、显式零值和运行时部分更新。
- `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm build:server` / `pnpm test` 全绿；
  `pnpm format:check` 脚本未配置。
- 本地管理端 `/theme` 已显示第五项“冰霜融化”；验收期间临时启用 Frost 后公开接口返回
  `{ effects: ["frost"] }`，C 端真实入口挂载 `1280 x 910` Frost 输出画布，冰霜覆盖、
  指针融化轨迹和重新冻结均正常，连续运行无控制台错误，验收结束后已恢复原配置。
- 本次未改数据库且未执行 migration；未新增自动化浏览器 E2E。

## 风险与后续扩展

- 特效对低端设备有性能开销；建议按需启用 1-2 个。
- 后续可扩展：特效参数调参、按页面粒度启用、接入更多 Canvas UI 组件（在
  `ThemeEffectLayer` 的映射表与契约枚举登记即可）。

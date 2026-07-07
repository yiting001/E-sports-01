# 用户端（apps/client）

面向 C 端玩家的独立商城前端（战术电竞风），与管理端 `apps/web` 平级、互不耦合。首页/分类可游客浏览，涉及个人身份的页面（我的、消息）需登录；登录/注册**只支持手机号验证码**方式，注册用户由后端默认分配 `member`（普通会员）角色。

## 实现了哪些功能

- **商城主框架**：底部 TabBar（移动端）/ 顶部导航（PC 端）承载首页、分类、消息、我的四个一级页；UI 演示数据见 `src/config/*.mock.ts`。
- **短信登录**：手机号 + 验证码登录（要求手机号已注册），调用后端 `POST /auth/sms/code`、`POST /auth/sms/login`。
- **短信注册**：手机号 + 验证码 + 可选昵称注册（要求手机号未注册），调用后端 `POST /auth/sms/register-code`、`POST /auth/sms/register`；注册成功后端直接签发令牌，前端即自动登录。
- **用户协议**：登录/注册均需勾选「我已阅读并同意《用户协议》」才可提交；协议正文为后台配置中心富文本（`auth.userAgreement` 键），公开接口 `GET /config/agreement` 登录前可读，弹层（`AgreementDialog`）内 DOMPurify 消毒后展示。
- **登录守卫**：访问带 `meta.requiresAuth` 的页面（我的 / 消息）未登录时自动重定向到 `/login` 并带 `redirect` 回跳地址；已登录再访问登录页直接回首页。
- **登录态展示**：「我的」页头部登录后展示昵称与用户 ID 并提供退出登录；未登录展示「立即登录」入口；PC 端个人页采用左右两列，右侧订单与更多功能紧凑衔接。
- **更多功能网格（全部落地）**：领券中心 `/coupons/center`、我的优惠券 `/coupons/mine`、会员等级 `/member/levels`、排行榜 `/rank`、福利活动 `/activities`（详情 `/activities/:id`）、打手入驻 `/profile/booster`、公告通知 `/notices`、搭建同款电竞系统 `/build`（介绍页 + 在线客服咨询入口）；入口 → 路由映射见 `components/profile/FeatureGrid.vue` 的 `ENTRY_ROUTES`。
- **更多功能页导航规范**：个人页进入的功能页统一采用商品详情页同类型的顶部返回栏 + 标题，不使用侧边菜单式导航；PC 端由 `styles/base.css` 的 `client-page` 页面壳统一收敛标题栏和内容区，订单/榜单等内容筛选使用紧凑分段按钮。

> 说明：账号密码登录属于管理端 `apps/web` 的能力，用户端刻意不提供，保证 C 端只能走短信方式。令牌存储键使用 `client.*` 前缀，与管理端 `infra.*` 隔离，避免同域串号。

## 目录结构导图（鉴权相关 · 在既有商城骨架上扩展）

```
apps/client/src
├─ config/env.ts           # 运行时配置 + 令牌存储键（client.* 与管理端隔离）
├─ config/icon-paths.ts    # 图标注册表（本次新增 phone / shieldCheck / logout）
├─ api
│  ├─ http.ts              # Axios 实例：注入令牌 / 解包响应 / 401 静默刷新 / toast 报错
│  ├─ token-storage.ts     # access/refresh 令牌读写清理
│  └─ auth.api.ts          # 短信登录/注册/发码 + 拉取档案
├─ utils/http-error.ts     # 统一错误信息提取
├─ stores/auth.store.ts    # 鉴权状态：令牌生命周期 + 当前用户档案
├─ router
│  ├─ index.ts             # 路由表：新增 /login（全屏），我的/消息标记 requiresAuth
│  └─ guard.ts             # 全局前置守卫（未登录拦截并带 redirect）
├─ components/auth/AgreementDialog.vue  # 用户协议弹层（惰性拉取富文本并消毒展示）
├─ views/auth/LoginView.vue          # 短信登录/注册（SegmentTabs 双页签，共用发码倒计时，需勾选同意用户协议）
├─ components/profile/ProfileHeader.vue  # 登录入口 / 昵称展示 / 退出登录（在既有组件上扩展）
└─ styles/base.css                       # 全局设计令牌 + client-page 独立功能页页面壳
```

## 登录 / 注册时序

```
用户 → LoginView：输入手机号，点击「发送验证码」
     → authApi.sendLoginCode / sendRegisterCode（按当前页签选择）
     → 后端按配置中心 sms.provider 发码（log 驱动打到日志），返回 cooldown 用于倒计时
用户 → 输入验证码，点击「登录 / 注册并登录」
     → authStore.smsLogin / smsRegister → 保存令牌 → loadProfile()
     → 守卫放行，跳转 redirect 或首页
```

## 本地启动

```bash
# 依赖后端与 Postgres/Redis 已启动（见 docs/sms.md）
cp apps/client/.env.example apps/client/.env
pnpm --filter @app/client dev   # http://127.0.0.1:5174
```

无短信密钥时，把配置中心 `sms.provider` 保持默认 `log`，验证码会打印到后端日志，便于联调。

# 用户端（apps/client）

面向 C 端玩家的独立前端应用，与管理端 `apps/web` 平级、互不耦合。当前只实现「短信验证码登录 / 注册」这一入口，注册用户由后端默认分配 `member`（普通会员）角色。

## 实现了哪些功能

- **短信登录**：手机号 + 验证码登录（要求手机号已注册），复用后端 `POST /auth/sms/code`、`POST /auth/sms/login`。
- **短信注册**：手机号 + 验证码 + 可选昵称注册（要求手机号未注册），复用后端 `POST /auth/sms/register-code`、`POST /auth/sms/register`；注册成功后端直接签发令牌，前端即自动登录。
- **登录守卫**：未登录访问受保护页自动重定向到 `/login` 并带 `redirect`；已登录访问登录页回首页。
- **用户中心首页**：展示当前用户昵称、手机号、角色、所属租户，并提供退出登录。

> 说明：账号密码登录属于管理端 `apps/web` 的能力，用户端刻意不提供，保证 C 端只能走短信方式。

## 目录结构导图

```
apps/client
├─ index.html                 # 挂载点，标题「电竞用户中心」
├─ vite.config.ts             # 端口 5174（与管理端 5173 并行）、@ 别名
├─ .env.example               # VITE_API_BASE_URL（后端 /api 基址）
└─ src
   ├─ main.ts                 # 装配 Pinia / 路由 / Element Plus
   ├─ App.vue                 # 仅承载 <router-view>
   ├─ config/env.ts           # 运行时配置 + 令牌存储键（client.* 与管理端隔离）
   ├─ api
   │  ├─ http.ts              # Axios 实例：注入令牌 / 解包响应 / 401 静默刷新
   │  ├─ token-storage.ts     # access/refresh 令牌读写
   │  └─ auth.api.ts          # 短信登录/注册/发码 + 拉取档案
   ├─ stores/auth.store.ts    # 鉴权状态：令牌生命周期 + 当前用户档案
   ├─ router
   │  ├─ routes.ts            # 登录页(public) + 用户首页
   │  ├─ guard.ts             # 全局前置守卫（未登录拦截 / 档案补全）
   │  └─ index.ts             # 路由实例装配
   ├─ utils/http-error.ts     # 统一错误信息提取
   ├─ components/auth
   │  ├─ AuthHeroPanel.vue    # 登录页左侧品牌插画（C 端静态文案）
   │  └─ AuthHeroPanel.css
   └─ views
      ├─ LoginView.vue        # 短信登录/注册（双 Tab，共用发码倒计时）
      ├─ LoginView.css
      ├─ HomeView.vue         # 登录后用户中心
      └─ HomeView.css
```

## 登录 / 注册时序

```
用户 → LoginView：输入手机号，点击「发送验证码」
     → authApi.sendSmsLoginCode / sendSmsRegisterCode（按当前 Tab 选择）
     → 后端按配置中心 sms.provider 发码（log 驱动打到日志），返回 cooldown 用于倒计时
用户 → 输入验证码，点击「登录 / 注册并登录」
     → authStore.smsLogin / smsRegister → 保存令牌 → loadProfile()
     → 守卫放行，跳转 redirect 或用户首页
```

## 本地启动

```bash
# 依赖后端与 Postgres/Redis 已启动（见 docs/sms.md）
cp apps/client/.env.example apps/client/.env
pnpm --filter @app/client dev   # http://127.0.0.1:5174
```

无短信密钥时，把配置中心 `sms.provider` 保持默认 `log`，验证码会打印到后端日志，便于联调。

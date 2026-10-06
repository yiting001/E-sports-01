# 微信小程序端（@app/uni-esports）

uni-app（Vue 3 + Vite + TS + Pinia）**仅编译到微信小程序**（mp-weixin），与 `apps/client` 共用同一后端与 `packages/contracts`。业务设计文档见 [docs/uni-esports.md](../../docs/uni-esports.md)。

## 快速开始

```bash
# 仓库根目录执行（Node >= 20，pnpm >= 9）
pnpm install --filter @app/uni-esports --filter @app/contracts
pnpm --filter @app/contracts build        # 共享契约产物，首次必须先构建

# 开发（watch 模式）
pnpm --filter @app/uni-esports dev:mp-weixin

# 生产构建
pnpm --filter @app/uni-esports build
```

然后用**微信开发者工具**：

1. 「导入项目」，目录选择 `apps/uni-esports/dist/dev/mp-weixin`（开发）或 `apps/uni-esports/dist/build/mp-weixin`（生产构建）；
2. AppID 填你的小程序 AppID（没有可选「测试号」）；本地调试请勾选右上角「详情 → 本地设置 → 不校验合法域名」（工程已默认 `urlCheck: false`）。

> 也可以用 HBuilderX 运行：文件 → 打开目录 → 选择 `apps/uni-esports`（CLI 工程）→ 运行 → 运行到小程序模拟器 → 微信开发者工具。

## 接口配置（关键）

环境变量在**构建时**烘焙进产物，改完 env 必须重新 `dev`/`build` 才生效：

| 文件 | 加载时机 | 说明 |
| --- | --- | --- |
| `.env.development` | `dev:mp-weixin` | 开发环境，已预填 `esports.muyuhen.com` |
| `.env.production` | `build` | 生产构建，发布前按小程序后台域名核对 |
| `.env.local`（自建，被 git 忽略） | 两者都加载且优先级最高 | 个人本地覆盖，例如指向 `http://127.0.0.1:3000/api` 联调 |

三个变量：`VITE_API_BASE_URL`（REST，含 `/api`）、`VITE_WS_BASE_URL`（IM 的 wss）、`VITE_TENANT_CODE`（租户编码）。**没有 env 文件时构建产物里是空配置，App 启动会弹「缺少接口配置」提示**。

## 常见问题对照

| 现象 | 原因与处理 |
| --- | --- |
| App 启动弹「缺少接口配置」 | env 变量没打进产物：确认 env 文件存在后重新构建 |
| 请求报 `url not in domain list` | 真机/正式包：到小程序后台「开发设置 → 服务器域名」配置 request/uploadFile/socket 合法域名；开发者工具本地：勾选「不校验合法域名」 |
| 请求 `fail`、超时 | 后端未启动或域名不通，先用 `curl https://你的域名/api/config/branding` 验证 |
| 接口返回租户相关错误 | `VITE_TENANT_CODE` 与后台租户不一致 |
| 聊天连不上 | socket 合法域名未配置；垫片仅支持 wss/开发环境 ws |
| 支付提示「微信支付暂未在小程序开放」 | 服务端尚未提供小程序支付渠道（WX_LITE + code2session），属预期降级，见 docs/uni-esports.md 第 8 节 |

## 上架前核对

- [ ] `src/manifest.json` 的 `mp-weixin.appid` 填真实 AppID；
- [ ] `.env.production` 域名已 ICP 备案并配好小程序后台合法域名；
- [ ] 小程序后台填写《用户隐私保护指引》（相册/摄像头/头像昵称）；
- [ ] 管理端已配置品牌名称与《用户协议与隐私政策》正文；
- [ ] 真机走通：登录 → 浏览 → 下单（余额支付）→ 订单详情 → 消息。

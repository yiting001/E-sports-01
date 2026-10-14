# new-esports（新一代 C 端 uni-app 工程）

HBuilderX 原生工程（Vue 3 + TypeScript），与 `apps/client`、`apps/uni-esports` 使用同一后端。
视觉体系为 **Runway 设计系统**（深色电影感、影像优先、界面近乎隐形），十二个功能页面已落地：**首页 / 消息 / 我的 / 登录 / 商品详情 / 我的钱包 / 会员等级 / 平台通知（列表·详情）/
我的订单 / 确认下单 / 聊天（客服会话与订单群聊）**（含真实接口功能）。

## 运行

1. HBuilderX 打开本目录 → 运行 → 运行到浏览器（H5）或小程序模拟器（mp-weixin）；
2. HBuilderX CLI：`/Applications/HBuilderX.app/Contents/MacOS/cli launch mp-weixin --project <本目录绝对路径>`；
   发行 H5：`cli publish web --project <本目录绝对路径>`（产物在 `unpackage/dist/build/web`）；
3. 首次编译若提示缺少 TypeScript 编译插件，按 HBuilderX 提示安装 `compile-typescript` 即可（本机已装）。

## 已实现页面与功能

| 页面 | 功能 |
| --- | --- |
| `pages/home/home` | **自定义导航**（无系统导航栏，满幅影像从屏幕顶端开始）、后台横幅轮播（间隔取配置）、公告轮播（点击进通知列表/详情）、搜索（服务端关键字过滤）、分类签（服务端分类过滤）、双列商品网格（触底分页加载、下拉刷新、已展示全部提示） |
| `pages/login/login` | 短信验证码登录（登录注册合一，首登自动注册）、验证码冷却倒计时、手机号格式校验、用户协议勾选 + 协议弹层（富文本，未配置时兜底文案）、邀请码选填（首登自动绑定）、登录后回跳来源页；受后台 `smsLoginEnabled` 开关控制 |
| `pages/profile/profile` | **自定义导航**（顶部留白按状态栏 + 小程序胶囊高度自适应）、登录态头部（头像/昵称/用户ID，未登录展示登录引导）、换头像（相册选择 → 自助上传 → 更新资料）、内联改昵称、会员等级卡（等级/折扣/累计消费/晋升进度）、账户余额卡、功能入口（我的订单/我的钱包/用户协议/联系客服）、退出登录二次确认、版本号 |
| `pages/product/detail` | 商品详情：满幅封面（点击全屏预览）、两端价格分列（手机端/电脑端现价 + 原价划线 + 折扣角标）、卖点标语、服务保障、富文本服务说明（展开/收起）、用户评价（平均分 + 分页加载更多，无评价给空态）、底部固定购买栏（未登录先跳登录） |
| `pages/wallet/wallet` | 我的钱包：余额大数字 + **微信充值**（小程序内走微信虚拟支付·代币充值：档位 6/30/98/198 元 → 服务端签名 → `wx.requestVirtualPayment` → 回调入账 → 轮询确认 → 刷新余额；H5 端给出「需在小程序内使用」提示）+ 余额流水（类型中文映射、入账/出账、变更后余额、触底分页）；未登录展示登录引导 |
| `pages/member/levels` | 会员等级：我的等级卡（等级/名称/折扣/累计消费/晋升进度条/再消费提示）、全部档位规则（当前档位白描边高亮）；未登录展示登录引导 |
| `pages/notice/list` `pages/notice/detail` | 平台通知：列表（标题 + 日期，点击进详情）与详情页（富文本正文）；首页公告条仅一条通知时直达详情，多条进列表 |
| `pages/order/list` | 我的订单：状态签筛选（全部 + 8 种状态）× 分页列表，卡片展示商品快照/区服与数量/实付与折前原价/下单时间；待付款可取消（二次确认）；未登录展示登录引导 |
| `pages/order/checkout` | 确认下单：服务信息（服务端切换影响单价、数字/文本游戏 ID、账号信息、数量步进、打手安排、备注）、费用明细（单价×数量 → 会员折扣 → 应付）、支付方式（余额支付；微信支付随服务端小程序支付渠道开通）；提交后余额支付即完成并跳转我的订单 |
| `pages/message/list` | 消息：客服会话与订单群聊统一列表（未读数、最后一条消息摘要、时间），顶部「联系客服」发起客服会话；tabBar 第二位并同步未读角标 |
| `pages/chat/chat` | 聊天页（客服 / 订单群共用）：进房拉历史、实时收发文本与图片（图片经自助上传）、系统消息居中、他人消息标注昵称与身份标签（老板/客服/打手/管理员）、已读位点推进、超过 5 分钟插时间分隔 |

跨页能力：底部 tabBar（首页 / 消息 / 我的，纯文字，无图标）、未登录访问受限入口自动跳登录页、
首页首屏**居中弹窗公告**（`/notice/popup`，按「公告 id + 更新时间」记已读，内容更新后重新弹出）。

## 设计系统（Runway 落地要点）

- **令牌集中在 `App.vue` 的 `page` 选择器**：色彩（`#000` 主底、`#1a1a1a` 强调面、`#27272a` 极细描边、Cool Slate 系列次级文字）、圆角（4/8/12/32rpx 微圆角，非胶囊）、字体栈（Inter/DM Sans + 系统黑体回退）；
- **字阶**：`.type-display`（48px 级、line-height 1.0、-1.2px 负字距）、`.type-headline`、`.type-title`、`.type-body`、`.type-small`、`.type-label`（大写 + 0.35px 正字距）、`.type-num`（等宽数字）；
- **零阴影、极细描边**；唯一允许的渐变是影像上的文字可读性遮罩（`.hero-scrim`）；
- **影像优先**：商品卡与横幅不做边框装饰，图片即卡片（8px 圆角）；功能入口用纯文字行 + 细分隔线，不引入图标插画；
- **界面无色相**：主操作 = 纯白底黑字（`.btn-primary`），次级 = 透明 + 细描边（`.btn-ghost`），选中态以白字/白下划线表示。

## 目录

```text
new-esports/
├── App.vue                    # 启动自检 + 租户初始化 + Runway 设计令牌与全局基础样式
├── pages/{home,login,profile}/ # 三个功能页面
├── components/                # sheet（底部弹层）/ product-card / notice-sheet / agreement-sheet
├── config/env.ts              # 接口与 WS 地址、租户编码、超时（读 .env）
├── api/                       # http.ts（uni.request 封装）+ token-storage + 各业务接口
├── stores/                    # 模块级响应式状态：auth / branding / portal / member / wallet
├── im/                        # wechat-socket 垫片（wx.connectSocket 适配）+ im-socket（socket.io /im）
├── tenant/tenant-context.ts   # 租户上下文（构建时固定 + 扫码参数覆盖）
├── types/                     # 传输层与业务契约的最小镜像（见下）
└── utils/                     # toast / format（金额·折扣·日期）/ media-url / rich-text / product-price
```

## 依赖与工程化

- 本工程已作为 pnpm workspace 成员（`package.json` + `node_modules`）参与构建：依赖走 `pnpm install`，
  在 pnpm 隔离布局下按 uni-esports 的经验把 socket.io 传递依赖（engine.io-client/parser、socket.io-parser、
  @socket.io/component-emitter、debug、ms）显式声明，避免 rollup 解析不到而出现裸 `require` 白屏；
- 因此 `@app/contracts` 现已可直接 `import`（IM 等新代码直接使用契约类型，不再新增本地镜像）；
  `types/*.ts` 里的历史镜像可后续增量替换为契约导入；
- IM 实时通道用 socket.io-client 4.8.1（与服务端同版本），小程序端由 `im/wechat-socket.ts` 提供
  `wx.connectSocket` 语义垫片，在 `main.js` 启动时最先注入。

## 请求层约定（与 apps/client 一致）

- 业务层拿到**已解包**的 `data`；`http.get/post/put/delete` 支持 `{ silent: true }` 关闭全局错误提示；
- 自动注入 `X-Tenant-Code` 与 `Authorization: Bearer <accessToken>`；
- `401`（含 `200 + code=401` 回包）**静默刷新令牌一次并重放**：并发 401 按会话代数去重只刷新一次；刷新失败清登录态并提示，同时通过 `onAuthExpired` 通知 `stores/auth` 清理资料；
- 错误统一为 `HttpError(status, bizCode, message)`；上传走 `uni.uploadFile` + `buildAuthHeaders()`。

## 环境变量

值写在项目根 `.env`（可另建 `.env.development` / `.env.production` 覆盖，同名变量后者优先）。

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | 后端 REST 基础地址（含 `/api` 前缀） |
| `VITE_WS_BASE_URL` | WebSocket 基础地址（不含命名空间，供 IM 聊天） |
| `VITE_TENANT_CODE` | 本工程归属租户编码（小程序无地址栏，构建时固定） |

**编译时烘焙进产物，改完必须重新运行/发布才生效。**

## 已知边界（等待后续指示）

- **状态管理**：本工程暂未接入 Pinia（HBuilderX 原生工程无依赖），用 `stores/*.ts` 模块级响应式状态承担同等职责；接入 workspace 后可平滑替换；
- **类型来源**：`types/*.ts` 是 `packages/contracts` 的最小镜像（只含页面消费字段）。接入 workspace（新增 `package.json` + `@app/contracts` 依赖）后删除镜像，改为从 `@app/contracts` 导入，业务 DTO 一律以契约为准；
- **富文本净化**：`utils/rich-text.ts` 为最小剔除（script/iframe/事件属性/javascript: 链接），小程序 `rich-text` 本身安全，仅 H5 需要；接依赖后应替换为 DOMPurify；
- **支付**：下单走余额支付；小程序充值已接入**微信虚拟支付（代币充值 → 余额入账）**，
  服务端驱动/回调/签名与小程序端拉起步已就绪，**上线前需**：在配置中心填 `wallet.wechatVirtual.*`（AppId/AppSecret/offerId/AppKey/代币比例/环境）、
  在小程序后台配置回调地址指向 `POST {notifyBaseUrl}/wallet/recharge/callback/wechat_virtual`（JSON 推送），并在微信开发者工具/真机小额实测（详见 docs/wallet.md 的虚拟支付章节）；
- **占位入口**：订单详情、优惠券、评价与退款申请尚未实现，点击时给出明确提示（不静默无响应）；
- **弹层与导航栏**：底部弹层（协议/等）`z-index:9999` 高于 H5 的 `uni-tabbar`（998），tab 页上不会被子标签栏压住；原生 `showModal` 是浅色弹窗，禁止传白色 `confirmColor`（否则按钮文字不可见）；
- **微信登录**：小程序微信登录需服务端提供 `code2session` 端点，暂未接入（与 `apps/uni-esports` 现状一致）；
- **字体**：`abcNormal` 以 Inter/DM Sans + 系统黑体回退替代；如需加载 Web 字体，H5 可加 `@font-face`，小程序需 `uni.loadFontFace`（依赖可下载的字体文件与合法域名）。

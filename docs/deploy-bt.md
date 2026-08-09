# 宝塔面板部署指南（CentOS 7+，单站点）

本文档描述如何把本项目（NestJS 后端 + Vue3 管理端/C 端）部署到装有 **宝塔面板** 的
**CentOS 7 及以上** 服务器。**前端与后端全部挂在同一个网站（同一个域名）下**，
由 Nginx 按路径转发：

```
用户浏览器 → https://example.com （一个宝塔站点）
   ├─ /            → C 端静态文件（apps/client/dist）
   ├─ /admin/      → 管理端静态文件（apps/web/dist，构建 base=/admin/）
   ├─ /api/        → Nginx 反代 → Node 后端 127.0.0.1:3000（REST）
   ├─ /socket.io/  → Nginx 反代（WebSocket，IM/客服）
   └─ /static/     → Nginx 反代（本地上传文件）
后端依赖：PostgreSQL 16 + Redis 7（均只监听本机）
```

---

## 1. 服务器与宝塔准备

1. CentOS 7.x / 8.x / Rocky / Alma，2 核 4G 以上，放行 22/80/443 端口。
2. 安装宝塔面板（官方脚本）：

   ```bash
   yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh
   ```

3. 登录宝塔面板，在「软件商店」安装：
   - **Nginx**（1.22+）
   - **PM2 管理器**（自带 Node.js；进入后把 Node 版本切到 **20.x**，本项目要求 Node ≥ 20）
   - **Redis**（7.x，装完默认监听 127.0.0.1:6379 即可）

> CentOS 7 自带的 glibc 可跑 Node 20；若 PM2 管理器安装 Node 20 失败，可改用
> `nvm install 20` 手动安装后再在 PM2 管理器中指定该版本。

## 2. 安装 PostgreSQL 16

宝塔软件商店的 PostgreSQL 管理器可直接安装；若无该插件，用 PGDG 官方源：

```bash
yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
yum install -y postgresql16-server
/usr/pgsql-16/bin/postgresql-16-setup initdb
systemctl enable --now postgresql-16
```

创建目标库与账号（口令请自行替换为强口令）：

```bash
sudo -u postgres psql <<'SQL'
CREATE USER esports WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE esports OWNER esports;
SQL
```

> 数据库只需本机访问，保持默认监听 127.0.0.1，不要对公网开放 5432。

仓库当前只有增量 migration，没有从零创建全部业务表的初始 migration，因此上面的空库不能
直接启动生产服务。首次迁移前必须先恢复一份已经验收的基础 schema/备份，再按本文执行
`migration:audit/show/run`。自定义格式和纯 SQL 备份分别使用：

```bash
runuser -u postgres -- /www/server/pgsql/bin/pg_restore \
  --clean --if-exists --no-owner --role=esports -d esports /safe/path/esports.dump

# 仅当备份是经过核对的纯 SQL 文件时使用
runuser -u postgres -- /www/server/pgsql/bin/psql \
  -v ON_ERROR_STOP=1 -d esports -f /safe/path/esports.sql
```

恢复前确认备份来源、目标库和可回滚副本；已有生产库不得执行上述 `--clean` 恢复命令。

## 3. 拉取代码并安装依赖

```bash
cd /www/wwwroot
git clone https://github.com/yiting001/E-sports-01.git esports
cd esports
git checkout esports          # 生产分支

npm i -g pnpm@9               # 项目要求 pnpm ≥ 9
pnpm install
```

## 4. 配置环境变量

### 4.1 后端 `apps/server/.env`

```bash
cp apps/server/.env.example apps/server/.env
```

按生产环境修改：

```ini
NODE_ENV=production
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=esports
DB_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
DB_NAME=esports
# 生产始终关闭自动同步，所有结构变更必须走已提交的 migration
DB_SYNCHRONIZE=false

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 两个 JWT 密钥务必替换为随机长字符串（如 openssl rand -hex 32）
JWT_SECRET=REPLACE_ME
JWT_REFRESH_SECRET=REPLACE_ME

# 首次启动播种的超级管理员（库中已存在则跳过）
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
```

### 4.2 前端生产配置（同域，接口走相对同域地址）

`apps/client/.env.production` 与 `apps/web/.env.production` 内容相同，
把 `example.com` 换成你的域名：

```ini
VITE_API_BASE_URL=https://example.com/api
VITE_WS_BASE_URL=https://example.com
VITE_CLIENT_BASE_URL=/
```

`VITE_CLIENT_BASE_URL=/` 表示管理端的“访问站点”打开同域根路径 C 端；建议显式配置。
同域 `/admin/` 部署漏配时，前端会自动回退到当前域名根路径并拼接租户编码。

## 5. 构建

可在服务器上构建，也可在本地构建后只上传产物（见 5.1）：

```bash
cd /www/wwwroot/esports
pnpm --filter @app/contracts build
pnpm build:server
pnpm build:client
# 管理端挂在 /admin/ 子路径，须以 VITE_BASE 指定构建 base
VITE_BASE=/admin/ VITE_CLIENT_BASE_URL=/ pnpm build:web
```

### 5.1 后端单文件打包（推荐，服务器免编译免装依赖）

在本地（任意平台）执行：

```bash
pnpm --filter @app/server bundle
```

产出 **`apps/server/bundle/main.js`**（全部依赖已内联的单文件）。
服务器上只需一个目录放两个文件：

```
/www/wwwroot/esports-server/
├── main.js     # 打包产物，直接上传
└── .env        # 后端环境变量（见 4.1，启动时自动读取工作目录下的 .env）
```

启动：

```bash
cd /www/wwwroot/esports-server
node main.js --help
node main.js migration:show
node main.js migration:run
pm2 start main.js --name esports-server -- start
pm2 save && pm2 startup
```

`migration:audit/show/run` 使用同一个 `main.js`，服务器无需源码、pnpm 或 TypeORM CLI。若
`migration:show` 报 `typeorm_migrations is missing` 或 `is empty`，不得继续执行或开启
`DB_SYNCHRONIZE`；先执行 `node main.js migration:audit > migration-audit.json`，再按
[单文件数据库迁移](./database-migrations.md) 人工核对并建立可信 baseline。迁移必须使用表
owner 或受控 DDL 账号，成功后再启动 PM2。

前端也在本地构建（命令同上），把 `apps/client/dist` 内容上传到站点根目录、
`apps/web/dist` 内容上传到站点 `admin/` 子目录即可，服务器无需 pnpm/仓库。

> 注意：本地上传图片/视频默认落在工作目录的 `uploads/`，升级替换 main.js 时不要删该目录。

产物：

| 应用   | 产物目录                                                    | 访问路径                                           |
| ------ | ----------------------------------------------------------- | -------------------------------------------------- |
| 后端   | `apps/server/dist`（或单文件 `apps/server/bundle/main.js`） | PM2 常驻，Nginx 反代 `/api` `/socket.io` `/static` |
| C 端   | `apps/client/dist`                                          | 站点根路径 `/`                                     |
| 管理端 | `apps/web/dist`                                             | 子路径 `/admin/`                                   |

> `packages/contracts` 为共享包，干净检出时必须先执行
> `pnpm --filter @app/contracts build`，再执行 `pnpm build:server`。

## 6. PM2 启动后端

宝塔「PM2 管理器 → 添加项目」：

- 项目目录：`/www/wwwroot/esports/apps/server`
- 启动文件：`dist/main.js`
- 项目名称：`esports-server`
- Node 版本：20.x

或命令行：

```bash
cd /www/wwwroot/esports
pnpm --filter @app/server migration:show
pnpm --filter @app/server migration:run
cd /www/wwwroot/esports/apps/server
pm2 start dist/main.js --name esports-server -- start
pm2 save && pm2 startup
```

这一步同样要求数据库已恢复基础 schema 且 migration history 是可信连续基线；命令失败时
不得启动 PM2。

启动日志出现 Nest 路由映射即成功；`curl http://127.0.0.1:3000/api/config/branding`
应返回 JSON。

> 后端进程工作目录必须是 `apps/server`（`.env` 与本地上传目录 `uploads/` 都按
> 工作目录解析）。后端只监听 127.0.0.1:3000，不对公网开放。

## 7. Nginx 单站点配置

宝塔「网站 → 添加站点」，域名填 `example.com`，
**网站目录指向 C 端产物**：`/www/wwwroot/esports/apps/client/dist`。

然后打开「设置 → 配置文件」，在该站点 `server {}` 内加入以下内容
（`^~` 前缀确保优先于宝塔模板中的静态缓存正则 location，否则 /admin/ 资源与反代路径会被正则截走 404）：

```nginx
# ---------- 后端 REST ----------
location ^~ /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100m;          # 备注图片/视频上传
}

# ---------- WebSocket（IM/客服，socket.io 握手路径） ----------
location ^~ /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}

# ---------- 本地上传文件 ----------
location ^~ /static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}

# ---------- 管理端（/admin/ 子路径，history 回退） ----------
location ^~ /admin/ {
    alias /www/wwwroot/esports/apps/web/dist/;
    try_files $uri $uri/ /admin/index.html;
    index index.html;
}
# 兼容不带斜杠的 /admin
location = /admin {
    return 301 /admin/;
}

# ---------- C 端（根路径，history 回退） ----------
location / {
    try_files $uri $uri/ /index.html;
}
```

保存后重载 Nginx。验证：

- `https://example.com/` → C 端首页
- `https://example.com/admin/` → 管理端登录页
- `https://example.com/api/config/branding` → JSON 响应

### HTTPS

站点「设置 → SSL」申请 Let's Encrypt 证书并开启强制 HTTPS。
前端 `.env.production` 中的地址协议须与之一致（https）。

## 8. 配置中心初始化（部署后必做）

用 `SEED_ADMIN_USERNAME/PASSWORD` 登录管理端（`/admin/`）→ 「系统 / 配置中心」，按需设置：

- `upload.local.baseUrl` → `https://example.com/static`（否则上传文件外链仍指向 127.0.0.1）
- `wallet.notifyBaseUrl` → `https://example.com`（支付回调基址）
- 支付渠道 `wallet.*` 商户密钥、短信渠道、品牌名称/Logo 等

## 9. 升级发布

```bash
cd /www/wwwroot/esports
git pull origin esports
pnpm install
pnpm --filter @app/contracts build
pnpm build:server
pnpm build:client
VITE_BASE=/admin/ VITE_CLIENT_BASE_URL=/ pnpm build:web
pm2 stop esports-server
pnpm --filter @app/server migration:show
pnpm --filter @app/server migration:run
pm2 restart esports-server --update-env
```

若采用 5.1 单文件方式：本地 `pnpm --filter @app/server bundle` 后上传新的 `main.js`。
数据库升级不能直接覆盖后重启，必须先备份数据库并停止全部旧版本 API、worker 和支付回调
写流量，再执行：

```bash
cd /www/wwwroot/esports-server
pm2 stop esports-server
node main.js migration:show
node main.js migration:run
pm2 restart esports-server --update-env
curl --fail http://127.0.0.1:3000/api/commerce/public/categories
pm2 save
```

任一迁移命令非零退出时保持服务停止并处理根因，不得删除 history 或打开 synchronize。
前端重新上传 dist 内容即可。

前端为纯静态产物，构建完成即生效（浏览器强刷新）。

## 10. 常见问题

| 现象                                       | 排查                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 后端启动报「缺少必需的环境变量」           | `.env` 未放在 `apps/server/` 下，或 PM2 工作目录不对                                                                                              |
| 前端接口 404                               | Nginx 未配置 `/api/` 反代，或 `VITE_API_BASE_URL` 少了 `/api` 后缀                                                                                |
| `/admin/` 白屏或资源 404                   | 管理端构建时未加 `VITE_BASE=/admin/`，或 Nginx `alias` 路径末尾少了 `/`                                                                           |
| `/admin/xxx` 刷新 404                      | `location /admin/` 缺少 `try_files ... /admin/index.html` 回退                                                                                    |
| 租户目录“访问站点”报未配置                 | 管理端既未配置 `VITE_CLIENT_BASE_URL`，当前页面也不在同域 `/admin/` 部署或本地可推断端口场景；显式设置 `VITE_CLIENT_BASE_URL=/`                  |
| 客服/IM 连不上、控制台报 websocket error   | 缺少 `/socket.io/` 的 Upgrade 反代配置                                                                                                            |
| 上传图片显示 127.0.0.1 链接                | 配置中心 `upload.local.baseUrl` 未改为公网地址                                                                                                    |
| 上传大视频报 413                           | Nginx `client_max_body_size` 过小                                                                                                                 |
| 支付回调收不到                             | 配置中心 `wallet.notifyBaseUrl` 未设为公网 https 地址                                                                                             |
| 单文件启动后接口报缺字段                   | 发布时跳过了 `node main.js migration:show/run`；立即停写，history 缺失或为空时先运行 `node main.js migration:audit` 并按迁移文档核对可信 baseline |
| migration 提示 `must be owner of table`    | 当前数据库账号不是既有表 owner；改用受控 DDL/owner 账号执行，不要给常驻应用账号永久超级权限                                                       |
| 建表报 `uuid_generate_v4() does not exist` | 旧版本代码依赖 uuid-ossp 扩展；现已改用 PG 13+ 内置 `gen_random_uuid()`，更新后端后重建库即可                                                     |

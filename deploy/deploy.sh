#!/usr/bin/env bash
# 服务器端部署脚本：由 CI 上传产物后调用，也可在服务器上手动执行。
# 前提：同目录已有 CI 产物 artifacts/，以及按 .env.example 配置好的 .env。
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "已生成 deploy/.env（来自 .env.example），请确认路径与端口后重新执行。" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [ ! -f "${ESPORTS_SERVER_ENV_FILE}" ]; then
  echo "后端环境变量文件不存在：${ESPORTS_SERVER_ENV_FILE}" >&2
  exit 1
fi

mkdir -p "${ESPORTS_UPLOADS_DIR}"
chown -R 1000:1000 "${ESPORTS_UPLOADS_DIR}"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> 构建镜像（仅拷贝 CI 产物，秒级完成）"
${COMPOSE} build

echo "==> 数据库迁移检查与执行（复用现有数据库，禁止 synchronize）"
MIGRATION_SHOW_OUTPUT=$(${COMPOSE} run --rm --no-deps server node main.js migration:show 2>&1 | tee /dev/stderr) || true
if echo "${MIGRATION_SHOW_OUTPUT}" | grep -qE 'typeorm_migrations (is missing|is empty)'; then
  echo "!!> 警告：typeorm_migrations 缺失/为空，按 docs/database-migrations.md 先人工完成 migration:audit 基线核对；本次跳过 migration:run，仅部署应用。" >&2
else
  ${COMPOSE} run --rm --no-deps server node main.js migration:run
fi

echo "==> 启动/更新服务"
${COMPOSE} up -d --remove-orphans

echo "==> 健康检查"
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${ESPORTS_SERVER_PORT:-3012}/api/commerce/public/categories" > /dev/null \
    && curl -sf "http://127.0.0.1:${ESPORTS_WEB_PORT:-8080}/health" > /dev/null \
    && curl -sf "http://127.0.0.1:${ESPORTS_CLIENT_PORT:-8081}/health" > /dev/null; then
    echo "==> 部署成功"
    docker image prune -f > /dev/null
    exit 0
  fi
  sleep 5
done

echo "==> 健康检查超时，请查看容器日志：${COMPOSE} ps && ${COMPOSE} logs --tail=100" >&2
exit 1

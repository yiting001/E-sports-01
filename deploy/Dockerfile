# 部署用轻量镜像：仅拷贝 CI 预构建产物，服务器上秒级构建（低内存机器不做编译）。
# 产物由 .github/workflows/deploy-esports.yml 在 GitHub Actions 中构建后放入 artifacts/。

FROM node:20.19.4-bookworm-slim AS server

WORKDIR /app

ENV NODE_ENV=production

COPY artifacts/server/main.js ./main.js

RUN mkdir -p uploads \
  && chown -R node:node /app

USER node

CMD ["node", "main.js", "start"]

FROM nginx:alpine AS web

COPY nginx-static.conf /etc/nginx/conf.d/default.conf
COPY artifacts/web-dist /usr/share/nginx/html

EXPOSE 80

FROM nginx:alpine AS client

COPY nginx-static.conf /etc/nginx/conf.d/default.conf
COPY artifacts/client-dist /usr/share/nginx/html

EXPOSE 80

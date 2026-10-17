# 部署用轻量镜像：仅拷贝 CI 预构建产物，服务器上秒级构建（低内存机器不做编译）。
# 产物由 .github/workflows/deploy-esports.yml 在 GitHub Actions 中构建后放入 artifacts/。
# 基础镜像固定到上次成功部署的 digest：服务器访问 Docker Hub 不稳定，浮动 tag 会触发
# 新 digest 拉取并卡住部署。升级基础镜像时同步更新 digest，并先在服务器预拉取。

FROM node:20.19.4-bookworm-slim@sha256:6db5e436948af8f0244488a1f658c2c8e55a3ae51ca2e1686ed042be8f25f70a AS server

WORKDIR /app

ENV NODE_ENV=production

COPY artifacts/server/main.js ./main.js

RUN mkdir -p uploads \
  && chown -R node:node /app

USER node

CMD ["node", "main.js", "start"]

FROM nginx:alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2 AS web

COPY nginx-static.conf /etc/nginx/conf.d/default.conf
COPY artifacts/web-dist /usr/share/nginx/html

EXPOSE 80

FROM nginx:alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2 AS client

COPY nginx-static.conf /etc/nginx/conf.d/default.conf
COPY artifacts/client-dist /usr/share/nginx/html

EXPOSE 80

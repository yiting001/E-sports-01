FROM node:20.19.4-bookworm-slim AS workspace

WORKDIR /workspace

RUN corepack enable \
  && corepack prepare pnpm@9.15.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/client/package.json apps/client/package.json

RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY apps/server apps/server
COPY apps/web apps/web
COPY apps/client apps/client

FROM workspace AS server-build

RUN pnpm --filter @app/contracts build \
  && pnpm --filter @app/server bundle

FROM node:20.19.4-bookworm-slim AS server

WORKDIR /app

ENV NODE_ENV=production

COPY --from=server-build /workspace/apps/server/bundle/main.js ./main.js

RUN mkdir -p uploads \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "main.js"]

FROM workspace AS frontend-build

ARG VITE_API_BASE_URL=/api
ARG VITE_WS_BASE_URL=
ARG VITE_CLIENT_BASE_URL=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
ENV VITE_CLIENT_BASE_URL=${VITE_CLIENT_BASE_URL}

RUN pnpm --filter @app/contracts build \
  && pnpm --filter @app/web build \
  && pnpm --filter @app/client build

FROM nginx:alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80

FROM nginx:alpine AS client

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /workspace/apps/client/dist /usr/share/nginx/html

EXPOSE 80

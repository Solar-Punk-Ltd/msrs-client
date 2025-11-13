FROM node:22-alpine AS builder

ENV CI=true

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM openresty/openresty:1.25.3.1-1-bookworm AS openresty-debian

RUN rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
RUN rm /usr/local/openresty/nginx/conf/conf.d/default.conf 2>/dev/null || true

COPY nginx/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY nginx/default.conf /usr/local/openresty/nginx/conf/conf.d/default.conf

COPY --from=builder /app/dist /usr/local/openresty/nginx/html

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
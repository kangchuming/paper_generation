# 第一阶段：构建应用
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build

# 第二阶段：部署到 nginx
FROM nginx:1.24-alpine
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
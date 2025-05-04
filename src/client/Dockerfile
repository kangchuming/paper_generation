# 第一阶段：构建应用
FROM node:18-alpine AS builder
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖，包括开发依赖
RUN npm install

# 全局安装 typescript
RUN npm install -g typescript

# 复制源代码和配置文件
COPY . .

# 设置环境变量
ENV NODE_ENV=production

# 直接使用 vite build
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
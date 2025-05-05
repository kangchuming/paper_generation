FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app
RUN chown -R node:node /app

# 先复制包管理文件
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install

# 复制其他文件
COPY --chmod=644 . .

# 使用非root用户
USER node

EXPOSE 3000

# 使用JSON格式CMD
CMD ["node", "app.js"]
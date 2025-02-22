FROM node:18-alpine
# 明确设置工作目录权限

WORKDIR /app
RUN chown -R node:node /app
# 先复制包管理文件
COPY package*.json ./
RUN npm install


# 复制其他文件
COPY --chmod=644 . .

RUN npm run build

# 使用非root用户
USER node

EXPOSE  7001
# 使用JSON格式CMD
CMD ["node", "dist/main.js"]
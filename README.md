# 木屋工作台

一个把工作、生活和娱乐收进像素木屋的个人工作台。工作间包含“一分小事”和个人日程/项目管理；生活市集与娱乐角可以添加、删除和排序常用入口。

## 服务器版能力

- 邮箱 + 密码注册登录，不发送验证码或验证邮件
- 密码使用 scrypt 加密摘要，数据库不保存明文密码
- 每个账户的数据严格按用户 ID 隔离
- SQLite 持久化；启动时自动执行 Drizzle 数据库迁移
- 适合低配 EC2：Node.js 单进程 + Nginx，无需 Docker 或 PostgreSQL
- 公开仓库只包含代码；数据库、私钥与环境文件已忽略

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

本地 HTTP 测试时把 `.env.local` 中的 `COOKIE_SECURE` 改为 `false`。

## 验证

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

## EC2 部署

生产目录约定为 `/home/ec2-user/apps/cabin-workbench`，数据保存在 `/home/ec2-user/data/cabin-workbench/oneminute.db`。部署模板位于 `deploy/`：

- `cabin-workbench.service`：systemd 守护进程，应用仅监听 `127.0.0.1:4270`
- `cabin-workbench.nginx.conf`：独立域名反向代理、登录限流与安全响应头

服务器环境文件 `/etc/cabin-workbench.env`：

```dotenv
DATABASE_PATH=/home/ec2-user/data/cabin-workbench/oneminute.db
COOKIE_SECURE=true
```

上线后通过 `/api/health` 检查应用和数据库状态。SQLite 备份时应同时处理数据库及 WAL 文件，推荐先使用 SQLite 的在线备份命令生成一致快照。

## 数据说明

ChatGPT Sites 旧版以站点专属的 ChatGPT 用户 ID 标识账户，无法安全地自动映射到新邮箱账户。因此服务器版默认创建全新的账户与数据空间；旧站仍可保留，后续可按明确账户关系做一次性导入。

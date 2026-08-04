# 木屋工作台

一个把工作、生活和娱乐收进像素木屋的个人工作台。工作间包含“一分小事”和个人日程/项目管理；生活市集与娱乐角可以添加、删除和排序常用入口。

## 两个版本

### 个人本地版

无需注册登录，也无需安装或配置数据库。运行一个命令即可启动，数据只写入当前电脑的单个文件：

```bash
npm run local
```

首次运行会自动准备依赖，默认打开 `http://127.0.0.1:4310`。完整说明见 [LOCAL_EDITION.md](LOCAL_EDITION.md)。

### 多用户服务器版

- 邮箱 + 密码注册登录，不发送验证码或验证邮件
- 密码使用 scrypt 加密摘要，数据库不保存明文密码
- 每个账户的数据严格按用户 ID 隔离
- SQLite 持久化；启动时自动执行 Drizzle 数据库迁移
- 适合低配 EC2：Node.js 单进程 + Nginx，无需 Docker 或 PostgreSQL
- 公开仓库只包含代码；数据库、私钥与环境文件已忽略

## 开发服务器版

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
npm run local:smoke
```

## 生成公开下载包

提交代码后运行 `npm run package:editions`，会在 `public/downloads/` 生成个人本地版和多用户服务器版两个 ZIP。压缩包只取 Git 已跟踪的公开文件，因此不会包含数据库、环境变量、密钥、依赖目录或构建缓存。

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

### 阿里云部署

阿里云模板使用独立的 Node.js 22 运行时，不替换服务器上已有的 Node.js 版本：

- 应用目录：`/opt/cabin-workbench`
- 数据目录：`/var/lib/cabin-workbench`
- 内部端口：`127.0.0.1:4270`
- 服务模板：`deploy/cabin-workbench-aliyun.service`
- Nginx 模板：`deploy/cabin-workbench-aliyun.nginx.conf`
- 受限安全组下的反向隧道：`deploy/cabin-workbench-tunnel.service`
- 公网入口 Nginx：`deploy/cabin-workbench-gateway.nginx.conf`

运行服务使用无登录权限的 `cabin-workbench` 系统用户，数据库目录权限为 `0700`，数据库文件由 `0077` umask 保护。

当前线上实例通过一条受限的 SSH 反向隧道连接既有公网入口；隧道仅绑定入口机的 `127.0.0.1:14270`，公网由 Nginx 在 `8443` 提供 HTTPS。这样无需占用阿里云上已有的 `3001`、`4173` 服务端口，也无需暴露应用的内部端口。

## 数据说明

ChatGPT Sites 旧版以站点专属的 ChatGPT 用户 ID 标识账户，无法安全地自动映射到新邮箱账户。因此服务器版默认创建全新的账户与数据空间；旧站仍可保留，后续可按明确账户关系做一次性导入。

# 生产部署

以下路径以 `/www/wwwroot/vakao-hub` 为例，按服务器实际目录调整。

## 1. 前置

- Node.js >= 22.18
- pnpm（`corepack enable && corepack prepare pnpm@12.16.1 --activate`）
- MySQL 8（本机或内网）
- Nginx
- 运行用户建议 `www`（宝塔默认），并确保对 `packages/server/storage` 有写权限

## 2. 数据库

执行 [mysql-init.sql.example](mysql-init.sql.example)，创建库与专用账号（不要用 root 跑应用）。

## 3. 构建

```bash
cd /www/wwwroot/vakao-hub
pnpm install --frozen-lockfile
pnpm build
```

## 4. 服务端配置

```bash
cd packages/server
cp .env.production.example .env
# 修改 JWT_SECRET、ADMIN_PASSWORD、DB_*、PUBLIC_BASE_URL、CORS_ORIGINS
chmod 600 .env
```

硬性要求：

- `NODE_ENV=production`
- `DB_SYNCHRONIZE=false`
- `JWT_SECRET` ≥ 32 字符
- `ADMIN_PASSWORD` ≥ 8 位
- `PUBLIC_BASE_URL` 为对外 HTTPS 地址（不带 `/api`）
- `CORS_ORIGINS` 显式列出管理端域名（下载页与 API 同域时可不加）

## 5. 迁移

```bash
cd packages/server
pnpm migrate:run
```

迁移脚本会先编译到 `dist/database/migrations`，再执行未应用的迁移；回滚用 `pnpm migrate:revert`。

## 6. systemd

```bash
cp deploy/vakaohub.service /etc/systemd/system/vakaohub.service
# 按需修改 User / WorkingDirectory / EnvironmentFile / node 路径
systemctl daemon-reload
systemctl enable --now vakaohub
systemctl status vakaohub
```

## 7. Nginx

管理端与下载页同域部署时，后台放在 `/admin/`：

```bash
ADMIN_BASE=/admin/ pnpm --filter @vakao/hub-admin build
# 把 packages/admin/dist 放到站点根下的 admin/ 目录
```

Nginx 增加：

```nginx
location = /admin { return 301 /admin/; }
location /admin/ { try_files $uri $uri/ /admin/index.html; }
location ^~ /api/ { proxy_pass http://127.0.0.1:3000; }
location ^~ /app/ { return 404; }
```

`/app/` 用于服务端代码与 storage，必须禁止直接访问。


```bash
cp deploy/nginx.conf.example /etc/nginx/conf.d/vakaohub.conf
# 修改 server_name、root、代理端口
nginx -t && systemctl reload nginx
```

- 主站：下载页静态文件 + `/api/` 反代；
- 管理端：单独子域，静态文件 + `/api/` 反代；
- 上传上限已设为 2g，与 `UPLOAD_MAX_BYTES` 保持一致；
- HTTPS 用 certbot 或宝塔申请证书，申请后把 80 端口跳转到 443。

## 8. 备份

```bash
chmod +x deploy/backup.sh
# crontab -e，例如每天 3:30
30 3 * * * /www/wwwroot/vakao-hub/deploy/backup.sh >> /var/log/vakaohub-backup.log 2>&1
```

备份包含 `mysqldump` 与 `storage/` 目录，默认保留 7 天，可用 `BACKUP_DIR` 覆盖目录。

## 9. 升级流程

```bash
cd /www/wwwroot/vakao-hub
git pull
pnpm install --frozen-lockfile
pnpm build
cd packages/server && pnpm migrate:run
systemctl restart vakaohub
```

## 10. 上线检查清单

- [ ] `.env` 权限 600，未入库
- [ ] `DB_SYNCHRONIZE=false`，迁移已执行
- [ ] JWT_SECRET / ADMIN_PASSWORD 已替换，管理员密码已通过后台改密
- [ ] `PUBLIC_BASE_URL`、`CORS_ORIGINS` 为真实域名
- [ ] 3000 端口只监听本机或由防火墙封禁
- [ ] Nginx `client_max_body_size` ≥ 上传上限
- [ ] 下载页与管理端均强制 HTTPS
- [ ] `storage/` 有写权限，磁盘余量足够
- [ ] 备份任务已生效，且实际还原过一次
- [ ] 监控 `/api/v1/health`（返回 503 表示数据库不可用）

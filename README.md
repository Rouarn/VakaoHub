# VaKao Hub（软件中心）

统一软件分发服务：Android 与桌面应用共用一套「应用 → 版本 → 产物」模型，提供目录、更新检查、产物下载、灰度/强更与事件统计。

线上：<https://dist.woyuxiaji.cn>（下载页）；管理端 <https://dist.woyuxiaji.cn/admin/>。

## 界面

三端共用一套「纸面 / 墨色 / 四色星芒」的设计语言，令牌与参考见 [`docs/design-system.md`](docs/design-system.md)。

- 启动器：`packages/launcher/docs/screenshot-macos.png`
- 管理后台：`packages/admin/docs/screenshot-dashboard.png`
- 下载站：`packages/website/docs/screenshot-home.png`

## 与其它项目的关系

- `vakao-static-hub`：保持「资源库 + 分享链接」定位，不承载软件分发，本次不做任何改动。
- `vakao-platform/servers/update`：继续只服务该仓库自身的 APP，不复用为通用分发。
- 本仓库：承接多项目软件分发（Android APK 与桌面 DMG/MSI/ZIP），是独立服务与独立后台。

## 目录结构

```
vakao-hub/
├─ packages/
│  ├─ shared/     # 前后端共享类型（平台/架构/格式/版本状态/事件）
│  ├─ server/     # NestJS 12 + TypeORM + MySQL 8
│  ├─ admin/      # Vue 3 + Vite + Naive UI 管理后台
│  ├─ launcher/   # 桌面启动器（Wails + Vue 3）
│  └─ website/    # 静态下载页
└─ .github/workflows/ci.yml
```

## 环境要求

- Node.js >= 22.18（当前开发环境 24.22）
- pnpm >= 10.15（packageManager 锁定 12.16.1）
- MySQL 8（本地使用 EServer 启动，未使用 Docker）
- 桌面启动器需要 Go 1.25+ 与 Wails v2.17+（当前已实现 macOS）

## 快速开始

1. 创建数据库（EServer 的 MySQL 控制台或命令行）：

```sql
CREATE DATABASE vakao_hub DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 安装依赖并构建共享包：

```bash
pnpm install
pnpm build:shared
```

3. 配置服务端环境：

```bash
cd packages/server
cp .env.example .env
# 修改 DB_USER / DB_PASSWORD / JWT_SECRET / ADMIN_PASSWORD
```

4. 启动（根目录）：

```bash
pnpm dev
# server: http://127.0.0.1:3000/api/v1
# admin:  http://localhost:5180
# swagger: http://127.0.0.1:3000/api/docs
```

首次启动会自动创建管理员（默认 `admin / admin123456`），请立即在 `.env` 中改成强密码并重启。

也可以分别启动：

```bash
pnpm dev:server
pnpm dev:admin
```

## 数据模型

| 表 | 说明 |
| --- | --- |
| `hub_apps` | 应用（appKey、名称、图标、仓库、主页） |
| `hub_releases` | 版本（versionName/versionCode、渠道、状态、灰度、强更、最低版本） |
| `hub_artifacts` | 产物（platform/arch/format、文件名、大小、SHA-256、下载量） |
| `hub_events` | 客户端事件（check/download/install/launch 等） |
| `hub_admin_users` | 管理端账号 |

同一版本可以挂多份产物：Android 的 APK、macOS 的 DMG、Windows 的 MSI/EXE/ZIP；平台与架构通过 `platform / arch / format` 区分。

## 接口

客户端（公开）：

- `GET /api/v1/catalog?platform=&arch=&channel=` 应用目录
- `GET /api/v1/updates/check?appKey=&platform=&arch=&versionCode=&channel=&deviceId=` 检查更新
- `GET /api/v1/updates/download/:artifactId` 下载产物（支持 Range）
- `POST /api/v1/updates/report` 事件上报

管理端（Bearer Token）：

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/change-password`
- `GET/POST/PATCH/DELETE /api/v1/admin/apps`
- `GET/POST/PATCH/DELETE /api/v1/admin/releases`
- `POST /api/v1/admin/releases/:id/publish|offline|force`
- `POST /api/v1/admin/releases/rollback/:appId`
- `POST /api/v1/admin/artifacts`（multipart，字段 `file/releaseId/platform/arch/format`）
- `DELETE /api/v1/admin/artifacts/:id`
- `GET /api/v1/admin/stats`、`GET /api/v1/admin/stats/funnel`、`GET /api/v1/admin/events`、`GET /api/v1/admin/audit-logs`

## 版本发布流程

1. 建应用（appKey 稳定，客户端与 URL 都依赖它）；
2. 建草稿版本（versionName + 单调递增的 versionCode）；
3. 上传产物（格式与平台必须匹配：apk→android、dmg→darwin、msi/exe→win32、appimage/deb→linux、zip 通用）；
4. 发布：全量或灰度（灰度按 `sha256(deviceId)` 稳定分桶）；
5. 需要止血时下架；强更开关可随时切换。

## 设计取舍与边界

- 统一模型而非两套系统：Android 与桌面只差「产物格式」和「安装执行方」，服务端共用一套版本、灰度、统计。
- MySQL 8：事件表会持续增长，且现有项目均使用 MySQL；生产 `DB_SYNCHRONIZE=false`，改表走迁移。
- 存储：产物落在 `STORAGE_DIR/{appKey}/v{versionCode}_{versionName}/`，按应用与版本分目录；删除版本/应用会清理磁盘文件。
- 安全：产物 SHA-256 入库，下载支持 ETag/Range；管理端 JWT；上传有扩展名与格式/平台一致性校验。后续补代码签名与 manifest 签名。
- 尚未实现（按计划推进）：产物魔数校验、代码签名/公证信息展示、灰度自动递增、回滚、Windows 安装链路。

## 桌面启动器

```bash
cd packages/launcher
wails dev     # 开发（Vite 热更新）
wails build   # 产出 build/bin/VaKaoHub.app
```

启动器读取 catalog，按平台/架构选择产物，支持自检测、重复安装提示、断点续传、SHA-256 与代码签名校验、强更拦截；macOS 将 DMG/ZIP 安装到 `~/Applications` 并支持启动、卸载、自动刷新更新状态。默认连接生产服务 `https://dist.woyuxiaji.cn/api/v1`，本地开发可在应用「设置」中修改。真实安装冒烟测试见 [packages/launcher/README.md](packages/launcher/README.md)。

Windows 构建由 [`.github/workflows/launcher-windows.yml`](.github/workflows/launcher-windows.yml) 在 GitHub Actions 上完成。

## 官网下载页

`packages/website` 是独立静态页，读取 `/catalog` 并按平台展示下载：

```bash
pnpm website   # http://localhost:5200
```

生产环境把静态文件放站点根目录，Nginx 将 `/api/` 反代到分发服务即可，详见 [packages/website/README.md](packages/website/README.md)。

## 生产部署

- 迁移：`cd packages/server && pnpm migrate`；回滚 `pnpm migrate:revert`
- 生产配置：复制 `packages/server/.env.production.example`，`DB_SYNCHRONIZE=false`，JWT/管理员密码必须替换
- 部署模板：`deploy/` 提供 systemd、Nginx、MySQL 初始化与备份脚本
- 管理端部署在 `/admin/` 时构建：`ADMIN_BASE=/admin/ pnpm --filter @vakao/hub-admin build`
- 生产路径：站点 `/www/wwwroot/Vakao-hub`、服务端 `/www/wwwroot/Vakao-hub/app`、后台 `/www/wwwroot/Vakao-hub/admin`
- 完整步骤与上线检查清单见 [deploy/README.md](deploy/README.md)

## 旧数据与 static-hub 的处理

- 不迁移 `vakao-static-hub` 的历史版本、事件与 APK 文件，新库从空开始。
- `vakao-static-hub` 的 app-update 模块在本服务稳定后整体下线；不保留旧客户端兼容地址。
- `vakao-static-hub` 的文件、分享与直链功能不受影响。

## 路线图

- [x] monorepo 骨架、shared 契约、server 核心接口、admin 基础页面
- [x] 桌面启动器 MVP（Wails：目录/下载/SHA-256/DMG 安装/启动）
- [x] 真实应用接入：WireDeck 1.0.2（macOS）、点墨 0.1.0（Android）
- [x] 管理员改密与事件漏斗看板
- [x] 数据库迁移、生产环境硬校验与部署模板（systemd/Nginx/备份）
- [ ] Windows 安装链路验证（CI 工作流已提供，尚未在 Windows 上实跑）
- [x] 实际服务器上线：https://dist.woyuxiaji.cn、管理端 /admin/、每日 3:30 备份
- [ ] 备份异地存放与恢复演练
- [ ] 生产管理员首次改密
- [ ] macOS 签名与公证（需要 Apple Developer Program，暂缺）
- [x] 安全加固：令牌吊销、登录锁定、操作审计、产物魔数校验、版本回滚
- [x] 事件日志/审计页面、漏斗应用筛选
- [x] 启动器断点续传、强更拦截、签名完整性校验
- [x] 服务端单元测试与 CI 测试步骤
- [ ] manifest 签名与启动器自更新
- [ ] 灰度自动递增
- [x] 官网下载页与静态入口
- [x] 三端视觉统一（启动器 / 管理后台 / 下载站）
- [x] 启动器上架生产目录（`vakaohub` 0.1.0）

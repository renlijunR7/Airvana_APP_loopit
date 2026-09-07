# Airvana 服务器部署手册 v1.1

日期：2026-09-03。适用范围：`airvana-v5-fullstack` 单机版，目标为首批约 100 名测试用户。

这套部署采用 Ubuntu + Node.js + Nginx + systemd + SQLite。应用只监听服务器本机的 `127.0.0.1:8082`，公网流量统一经过 Nginx 和 HTTPS。每次发版都会先在独立目录安装、测试，再原子切换；健康检查失败会自动回到上一版。

> 边界：完成本手册只能证明网站与 API 已部署。邮箱验证码、Google 登录、外部 KYC、权威归因、支付、真实 AI 等第三方能力仍需分别接入和验收；本地 DEMO 结果不能当作真实商业结算。

## 一、准备清单

1. 一台 Ubuntu 22.04 或 24.04 服务器，建议至少 2 核 2 GB、30 GB SSD。
2. 一个域名，A 记录指向服务器公网 IP。香港服务器可免 ICP 备案；中国大陆服务器需先确认备案要求。
3. SSH 登录信息：公网 IP、登录用户、私钥或密码。
4. GitHub 仓库与目标分支。服务器需能只读拉取该分支；私有仓库建议配置 Deploy Key。
5. 云防火墙/安全组开放 TCP 22、80、443，8082 不对公网开放。

## 二、部署前先确认代码范围

服务器拉取的目标分支必须包含：

- `server.mjs`、`src/`、`public/`、`package.json`、`package-lock.json`
- `deploy/setup-server.sh`
- `deploy/deploy.sh`
- `deploy/rollback.sh`
- `deploy/healthcheck.sh`
- `deploy/backup.sh`、`deploy/backup.mjs`
- `deploy/airvana.service`、`deploy/nginx.conf`、`deploy/.env.example`

当前工作分支是 `codex/loopit-v2-update`。正式上线前应把经过审核的部署文件和反向代理修复提交到明确的发布分支，不要把本地数据库、`.env`、密钥、日志、构建缓存一起上传。

## 三、首次部署：按顺序执行

下面用这些占位符：

- `<SERVER_IP>`：服务器公网 IP
- `<SSH_USER>`：服务器登录用户，例如 `ubuntu`
- `<DOMAIN>`：正式域名，例如 `app.example.com`
- `<REPO_URL>`：Git 仓库地址，例如 `https://github.com/owner/repo.git`
- `<BRANCH>`：发布分支，例如 `codex/loopit-v2-update`

### 第 1 步：确认域名与端口

在域名控制台添加 A 记录：`<DOMAIN> -> <SERVER_IP>`。云服务器安全组只开放 22、80、443。

本机验证 DNS：

```bash
dig +short <DOMAIN>
```

结果应包含 `<SERVER_IP>`。

### 第 2 步：复制初始化脚本到服务器

在项目根目录执行：

```bash
scp deploy/setup-server.sh <SSH_USER>@<SERVER_IP>:/tmp/airvana-setup-server.sh
ssh <SSH_USER>@<SERVER_IP>
```

### 第 3 步：执行一次性初始化

登录服务器后执行：

```bash
sudo bash /tmp/airvana-setup-server.sh <REPO_URL> <BRANCH> <DOMAIN>
```

脚本会自动完成：

1. 安装 Node.js 24、Nginx、certbot、Git 和防火墙工具。
2. 创建无登录权限的 `airvana` 服务账号。
3. 把源码放到 `/opt/airvana/source`。
4. 生成 `/opt/airvana/.env` 与随机 `APP_SECRET`。
5. 安装 systemd 和 Nginx 配置。
6. 跑全量测试和结构验证。
7. 创建第一个独立 release，启动服务并检查 `/api/health`。
8. 配置每日 04:30 的 SQLite 在线备份。

如果仓库是私有仓库，先在服务器为 `airvana` 用户配置只读 Deploy Key，再执行本步骤。

### 第 4 步：签发 HTTPS

确认 DNS 已生效后：

```bash
sudo certbot --nginx -d <DOMAIN>
sudo certbot renew --dry-run
```

### 第 5 步：四层验收

```bash
# A. 进程
sudo systemctl --no-pager --full status airvana

# B. 服务器本机 API
curl -fsS http://127.0.0.1:8082/api/health

# C. 公网 HTTPS API
curl -fsS https://<DOMAIN>/api/health

# D. 首页与 HTTPS 跳转
curl -I https://<DOMAIN>/
```

然后用浏览器打开 `https://<DOMAIN>/`，至少人工检查：首页加载、钱包签名域名显示为 HTTPS、登录态 Cookie 带 Secure、刷新后登录态仍在。

## 四、日常发版

```bash
sudo bash /opt/airvana/current/deploy/deploy.sh <BRANCH>
```

脚本会：

1. 从远程仓库读取目标分支的最新提交。
2. 解包到 `/opt/airvana/releases/<时间>-<提交号>`。
3. 执行 `npm ci --omit=dev`、`npm test`、`npm run verify`。
4. 原子切换 `/opt/airvana/current`。
5. 重启服务并最多等待 20 秒进行健康检查。
6. 新版失败时自动切回发布前版本。

## 五、手动回滚

```bash
sudo bash /opt/airvana/current/deploy/rollback.sh
```

该命令会在 `current` 与 `previous` 两个已验证版本之间切换，并再次执行健康检查。它不会重写 Git 工作区，也不会碰生产数据库。

## 六、数据备份与恢复

备份任务安装在 `/etc/cron.d/airvana-backup`，备份文件位于 `/var/backups/airvana/`，默认保留 14 天。

检查备份：

```bash
sudo /opt/airvana/current/deploy/backup.sh
sudo ls -lh /var/backups/airvana/
```

恢复数据库必须在维护窗口进行：先停止服务，把当前数据库另存一份，再解压选定快照到 `/var/lib/airvana/airvana.db`，修正所有者为 `airvana:airvana`，最后启动服务并跑健康检查。恢复会覆盖当前业务数据，执行前必须再次确认快照时间。

## 七、常用运维命令

```bash
sudo journalctl -u airvana -f
sudo systemctl restart airvana
sudo nginx -t
sudo systemctl reload nginx
sudo du -sh /var/lib/airvana /var/backups/airvana /opt/airvana/releases
```

建议给 `https://<DOMAIN>/api/health` 配置 5 分钟一次的外部监控，并对失败、证书到期、磁盘超过 80% 设置告警。

## 八、生产能力边界

- 可部署并验证：同域网页、API、SQLite 数据、钱包签名登录、systemd 自动拉起、HTTPS、备份、版本回滚。
- 生产环境自动关闭 DEMO 登录。
- `AI_PROVIDER=local` 仍是本地模拟，不代表真实 AI 服务。
- 邮箱验证码、Google 登录、KYC、权威归因、支付和商业结算需要外部服务与单独验收。
- Flutter App 只有切换到正式 API 地址并完成真机网络、登录、失败降级测试后，才算接入服务器。

#!/usr/bin/env bash
# 全新 Ubuntu 22.04/24.04 服务器初始化。
# 用法：sudo bash setup-server.sh <git仓库地址> [分支，默认main] [域名，暂无则填_]
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo '请使用 sudo 或 root 运行。' >&2
  exit 1
fi

REPO_URL="${1:?用法: sudo bash setup-server.sh <git仓库地址> [分支] [域名或_] }"
BRANCH="${2:-main}"
DOMAIN="${3:-_}"
ROOT_DIR=/opt/airvana
SOURCE_DIR=${ROOT_DIR}/source

if [[ ! "${BRANCH}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo '分支名包含不支持的字符。' >&2
  exit 1
fi
if [[ "${DOMAIN}" != '_' && ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo '域名格式不正确。' >&2
  exit 1
fi

echo '== 1/8 安装 Node.js 24、Nginx、HTTPS 与基础工具 =='
apt-get update
apt-get install -y ca-certificates curl git gnupg nginx certbot python3-certbot-nginx openssl ufw
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo '== 2/8 创建隔离运行账号与持久化目录 =='
id -u airvana >/dev/null 2>&1 || useradd --system --home "${ROOT_DIR}" --shell /usr/sbin/nologin airvana
install -d -o airvana -g airvana -m 750 "${ROOT_DIR}" "${ROOT_DIR}/releases" /var/lib/airvana /var/backups/airvana

echo "== 3/8 获取 ${BRANCH} 分支 =="
if [ ! -d "${SOURCE_DIR}/.git" ]; then
  runuser -u airvana -- git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${SOURCE_DIR}"
else
  runuser -u airvana -- git -C "${SOURCE_DIR}" remote set-url origin "${REPO_URL}"
fi

echo '== 4/8 生成生产环境配置 =='
if [ ! -f "${ROOT_DIR}/.env" ]; then
  install -o airvana -g airvana -m 600 "${SOURCE_DIR}/deploy/.env.example" "${ROOT_DIR}/.env"
  SECRET="$(openssl rand -hex 32)"
  sed -i "s|^APP_SECRET=.*|APP_SECRET=${SECRET}|" "${ROOT_DIR}/.env"
fi
if [ "${DOMAIN}" = '_' ]; then
  sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=false|' "${ROOT_DIR}/.env"
  sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=|' "${ROOT_DIR}/.env"
else
  sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=true|' "${ROOT_DIR}/.env"
  sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://${DOMAIN}|" "${ROOT_DIR}/.env"
fi
chown airvana:airvana "${ROOT_DIR}/.env"
chmod 600 "${ROOT_DIR}/.env"

echo '== 5/8 安装 systemd 与 Nginx =='
install -m 644 "${SOURCE_DIR}/deploy/airvana.service" /etc/systemd/system/airvana.service
sed "s|__AIRVANA_DOMAIN__|${DOMAIN}|g" "${SOURCE_DIR}/deploy/nginx.conf" > /etc/nginx/sites-available/airvana
ln -sfn /etc/nginx/sites-available/airvana /etc/nginx/sites-enabled/airvana
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload
systemctl enable airvana
nginx -t
systemctl reload nginx

echo '== 6/8 首次原子发布并执行健康检查 =='
chmod +x "${SOURCE_DIR}/deploy/deploy.sh" "${SOURCE_DIR}/deploy/healthcheck.sh" "${SOURCE_DIR}/deploy/rollback.sh" "${SOURCE_DIR}/deploy/backup.sh"
bash "${SOURCE_DIR}/deploy/deploy.sh" "${BRANCH}"

echo '== 7/8 配置每日数据库备份 =='
install -m 644 "${SOURCE_DIR}/deploy/airvana-backup.cron" /etc/cron.d/airvana-backup

echo '== 8/8 防火墙仅开放 SSH、HTTP、HTTPS =='
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

if [ "${DOMAIN}" = '_' ]; then
  cat <<NEXT

Airvana 服务已启动，本机健康检查已通过。

后续操作：
  1. 配置正式域名后更新 /etc/nginx/sites-available/airvana 和 /opt/airvana/.env。
  2. 执行 nginx -t、systemctl reload nginx，再用 certbot 签发 HTTPS。
  3. 查看日志：sudo journalctl -u airvana -f
  4. 日常发版：sudo bash /opt/airvana/current/deploy/deploy.sh ${BRANCH}
  5. 一键回滚：sudo bash /opt/airvana/current/deploy/rollback.sh
NEXT
else
  cat <<NEXT

Airvana 服务已启动，本机健康检查已通过。

当前域名：${DOMAIN}

后续操作：
  1. 确认域名 A 记录指向本机公网 IP。
  2. 签发 HTTPS：sudo certbot --nginx -d ${DOMAIN}
  3. 公网验证：curl -fsS https://${DOMAIN}/api/health
  4. 查看日志：sudo journalctl -u airvana -f
  5. 日常发版：sudo bash /opt/airvana/current/deploy/deploy.sh ${BRANCH}
  6. 一键回滚：sudo bash /opt/airvana/current/deploy/rollback.sh
NEXT
fi

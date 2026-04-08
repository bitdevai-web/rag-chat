#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  RAG Chat — First-time VPS setup (no Docker)
#
#  Run once on a fresh Ubuntu 22.04 / 24.04 VPS:
#    curl -fsSL https://raw.githubusercontent.com/YOUR_USER/rag-chat/main/setup-vps.sh | bash
#  or:
#    chmod +x setup-vps.sh && sudo ./setup-vps.sh
#
#  What it does:
#    1. Installs Node.js 22, npm, git
#    2. Installs PM2 (process manager — keeps app alive, auto-restarts)
#    3. Installs Nginx (reverse proxy on port 80)
#    4. Clones the repo to /opt/rag-chat
#    5. Creates .env with your credentials
#    6. Builds and starts the app via PM2
#    7. Configures Nginx → localhost:3000
#    8. Sets PM2 to start on system reboot
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Must run as root ──────────────────────────────────────────────────────────
if [[ "$EUID" -ne 0 ]]; then
  echo "Please run as root: sudo ./setup-vps.sh"
  exit 1
fi

APP_DIR="/opt/rag-chat"
APP_PORT="3000"
NODE_VERSION="22"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   RAG Chat — VPS First-time Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Collect config ────────────────────────────────────────────────────────────
read -rp "Git repo URL [https://github.com/bitdevai-web/rag-chat]: " GIT_REPO
GIT_REPO="${GIT_REPO:-https://github.com/bitdevai-web/rag-chat}"

read -rp "Login username [admin]: " LOGIN_USERNAME
LOGIN_USERNAME="${LOGIN_USERNAME:-admin}"

read -rsp "Login password [admin123]: " LOGIN_PASSWORD
LOGIN_PASSWORD="${LOGIN_PASSWORD:-admin123}"
echo ""

SESSION_SECRET="$(openssl rand -hex 32)"

echo ""
echo "LLM provider — anthropic or openai"
read -rp "LLM provider [anthropic]: " LLM_PROVIDER
LLM_PROVIDER="${LLM_PROVIDER:-anthropic}"

read -rp "LLM model [claude-sonnet-4-6]: " LLM_MODEL
LLM_MODEL="${LLM_MODEL:-claude-sonnet-4-6}"

read -rsp "LLM API key (can be set later in Settings): " LLM_API_KEY
LLM_API_KEY="${LLM_API_KEY:-}"
echo ""

read -rp "Your domain or server IP (for Nginx, e.g. chat.example.com or 1.2.3.4): " SERVER_NAME
SERVER_NAME="${SERVER_NAME:-_}"

# ── 1. System packages ────────────────────────────────────────────────────────
info "Updating apt packages…"
apt-get update -qq

info "Installing git, curl, build-essential…"
apt-get install -y -qq git curl build-essential nginx

# ── 2. Node.js 22 via NodeSource ──────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(".")[0].slice(1))')" -lt "$NODE_VERSION" ]]; then
  info "Installing Node.js ${NODE_VERSION}…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
else
  info "Node.js $(node --version) already installed."
fi
success "Node.js $(node --version)"

# ── 3. PM2 ────────────────────────────────────────────────────────────────────
info "Installing PM2…"
npm install -g pm2 --quiet
success "PM2 $(pm2 --version)"

# ── 4. Clone / update repo ────────────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo already exists — pulling latest…"
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
else
  info "Cloning repo to ${APP_DIR}…"
  git clone "$GIT_REPO" "$APP_DIR"
fi
success "Repo ready at ${APP_DIR}"

# ── 5. Write .env ─────────────────────────────────────────────────────────────
info "Writing .env…"
cat > "${APP_DIR}/.env" <<EOF
LOGIN_USERNAME=${LOGIN_USERNAME}
LOGIN_PASSWORD=${LOGIN_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
LLM_PROVIDER=${LLM_PROVIDER}
LLM_MODEL=${LLM_MODEL}
LLM_API_KEY=${LLM_API_KEY}
CHUNK_SIZE=512
CHUNK_OVERLAP=50
TOP_K=3
EOF
chmod 600 "${APP_DIR}/.env"
success ".env written"

# ── 6. Create data directories ────────────────────────────────────────────────
mkdir -p "${APP_DIR}/data/lancedb" "${APP_DIR}/data/models"
success "Data directories ready"

# ── 7. Install deps + build ───────────────────────────────────────────────────
info "Installing npm dependencies…"
cd "$APP_DIR"
npm ci --prefer-offline --no-audit --no-fund

info "Building Next.js app…"
NODE_ENV=production npm run build
success "Build complete"

# ── 8. PM2 ecosystem file ─────────────────────────────────────────────────────
info "Writing PM2 ecosystem config…"
cat > "${APP_DIR}/ecosystem.config.js" <<'ECOEOF'
module.exports = {
  apps: [{
    name        : "rag-chat",
    script      : "node_modules/.bin/next",
    args        : "start",
    cwd         : __dirname,
    instances   : 1,
    exec_mode   : "fork",
    env         : {
      NODE_ENV  : "production",
      PORT      : 3000,
    },
    env_file    : ".env",
    watch       : false,
    max_memory_restart: "800M",
    error_file  : "logs/err.log",
    out_file    : "logs/out.log",
    merge_logs  : true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }]
}
ECOEOF
mkdir -p "${APP_DIR}/logs"
success "PM2 config written"

# ── 9. Start app with PM2 ─────────────────────────────────────────────────────
info "Starting app with PM2…"
pm2 delete rag-chat 2>/dev/null || true
pm2 start "${APP_DIR}/ecosystem.config.js"
pm2 save
success "App started via PM2"

# ── 10. PM2 startup on reboot ─────────────────────────────────────────────────
info "Configuring PM2 to start on reboot…"
pm2 startup systemd -u root --hp /root | tail -1 | bash 2>/dev/null || true
success "PM2 startup configured"

# ── 11. Nginx reverse proxy ───────────────────────────────────────────────────
info "Configuring Nginx…"
cat > /etc/nginx/sites-available/rag-chat <<NGINXEOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    # Max upload size (for document uploads)
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # SSE / streaming support
        proxy_buffering    off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        chunked_transfer_encoding on;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/rag-chat /etc/nginx/sites-enabled/rag-chat
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
success "Nginx configured"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  RAG Chat is live!${NC}"
echo ""
echo -e "${GREEN}  URL      : http://${SERVER_NAME}${NC}"
echo -e "${GREEN}  Username : ${LOGIN_USERNAME}${NC}"
echo -e "${GREEN}  Password : ${LOGIN_PASSWORD}${NC}"
echo ""
echo -e "${GREEN}  App dir  : ${APP_DIR}${NC}"
echo -e "${GREEN}  Logs     : pm2 logs rag-chat${NC}"
echo -e "${GREEN}  Status   : pm2 status${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
warn "To enable HTTPS run: apt install certbot python3-certbot-nginx -y && certbot --nginx -d your-domain.com"

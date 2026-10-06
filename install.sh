#!/usr/bin/env bash
# StuMe VPS install — Node app + SQLite + optional demo seed.
# Usage:
#   ./install.sh              # install deps, db, seed demo, build
#   ./install.sh --no-seed    # skip seeding
#   PORT=8080 ./install.sh    # remember PORT for how you start the app
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DO_SEED=1
for arg in "$@"; do
  case "$arg" in
    --no-seed) DO_SEED=0 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
  esac
done

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    return 1
  fi
}

echo "=== StuMe install ==="
echo "Directory: $ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Node.js / npm not found.

Install Node 22 (recommended on Ubuntu):

  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
  node -v && npm -v

Or use nvm:

  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install 22

Then re-run ./install.sh
EOF
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Node $(node -v) is too old. Need Node 20+ (22 recommended)." >&2
  exit 1
fi

echo "Node $(node -v) / npm $(npm -v)"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    cat > .env <<'EOF'
DATABASE_URL="file:./prod.db"
LLM_PROVIDER=disabled
STUME_CORPUS=demo
NODE_ENV=production
EOF
    echo "Created .env with production defaults"
  fi
fi

# Ensure SQLite URL + demo corpus if unset
if ! grep -q '^DATABASE_URL=' .env 2>/dev/null; then
  echo 'DATABASE_URL="file:./prod.db"' >> .env
fi
if ! grep -q '^STUME_CORPUS=' .env 2>/dev/null; then
  echo 'STUME_CORPUS=demo' >> .env
fi
if ! grep -q '^LLM_PROVIDER=' .env 2>/dev/null; then
  echo 'LLM_PROVIDER=disabled' >> .env
fi

export NODE_ENV="${NODE_ENV:-production}"
# shellcheck disable=SC1091
set -a
source .env
set +a

echo ""
echo "> npm ci"
npm ci

echo ""
echo "> npx prisma generate"
npx prisma generate

echo ""
echo "> npx prisma db push"
npx prisma db push

if [[ "$DO_SEED" -eq 1 ]]; then
  echo ""
  echo "> STUME_CORPUS=demo npm run db:seed"
  STUME_CORPUS="${STUME_CORPUS:-demo}" npm run db:seed
else
  echo ""
  echo "Skipping seed (--no-seed)"
fi

echo ""
echo "> npm run build"
npm run build

PORT_VALUE="${PORT:-8080}"

cat <<EOF

=== Install complete ===

Start (foreground):
  PORT=${PORT_VALUE} npm start

Or systemd — /etc/systemd/system/stume.service:

  [Unit]
  Description=StuMe
  After=network.target

  [Service]
  Type=simple
  User=$(id -un)
  WorkingDirectory=${ROOT}
  Environment=NODE_ENV=production
  Environment=PORT=${PORT_VALUE}
  EnvironmentFile=${ROOT}/.env
  ExecStart=$(command -v npm) start
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target

Then:
  sudo systemctl daemon-reload
  sudo systemctl enable --now stume

If you use Cloudflare Tunnel to 8080, keep PORT=8080 (default above).
EOF

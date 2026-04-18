#!/usr/bin/env bash
# GEO local deployment script (macOS / Linux, no Docker)
# Usage: bash deploy-local.sh
set -euo pipefail

# ---------- config ----------
REPO_URL="${GEO_REPO_URL:-https://github.com/aigit0424/geo.git}"
BRANCH="${GEO_BRANCH:-claude/initialize-project-XAzlk}"

if [[ "$(uname -s)" == "Darwin" ]]; then
  DESKTOP="$HOME/Desktop"
else
  DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
fi
TARGET_DIR="$DESKTOP/claude"
PROJECT_DIR="$TARGET_DIR/GEO"

PG_DB="${PG_DB:-geo}"
PG_USER="${PG_USER:-geo}"
PG_PASSWORD="${PG_PASSWORD:-geo}"

# ---------- helpers ----------
log()  { printf "\033[1;34m[geo]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[geo]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[geo]\033[0m %s\n" "$*"; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing dependency: $1 (install it and re-run)"
}

# ---------- 1. check dependencies ----------
log "checking dependencies..."
need git
need python3
need node
need npm
need psql
need redis-cli

PY_VER="$(python3 -c 'import sys;print("%d.%d"%sys.version_info[:2])')"
[[ "$(printf '%s\n' "3.11" "$PY_VER" | sort -V | head -1)" == "3.11" ]] \
  || die "python >= 3.11 required, have $PY_VER"

NODE_VER="$(node -p 'process.versions.node')"
[[ "$(printf '%s\n' "20.0.0" "$NODE_VER" | sort -V | head -1)" == "20.0.0" ]] \
  || die "node >= 20 required, have $NODE_VER"

log "python $PY_VER, node $NODE_VER ok"

# ---------- 2. create desktop/claude and clone ----------
mkdir -p "$TARGET_DIR"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  log "repo already cloned at $PROJECT_DIR — pulling latest"
  git -C "$PROJECT_DIR" fetch origin "$BRANCH"
  git -C "$PROJECT_DIR" checkout "$BRANCH"
  git -C "$PROJECT_DIR" pull origin "$BRANCH"
else
  log "cloning $REPO_URL into $PROJECT_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
fi
cd "$PROJECT_DIR"

# ---------- 3. .env ----------
if [[ ! -f .env ]]; then
  log "creating .env"
  cat > .env <<EOF
APP_ENV=development
DEBUG=true
SECRET_KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')
DATABASE_URL=postgresql://${PG_USER}:${PG_PASSWORD}@localhost:5432/${PG_DB}
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]
EOF
else
  log ".env already exists — leaving untouched"
fi

# ---------- 4. postgres + redis ----------
log "ensuring postgres is running"
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null; then
    brew services start postgresql@16 || brew services start postgresql || true
  else
    sudo service postgresql start 2>/dev/null || sudo systemctl start postgresql || true
  fi
  sleep 2
fi
pg_isready -h localhost -p 5432 >/dev/null 2>&1 \
  || die "postgres is not reachable on localhost:5432"

log "ensuring redis is running"
if ! redis-cli ping >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null; then
    brew services start redis || true
  else
    sudo service redis-server start 2>/dev/null || redis-server --daemonize yes || true
  fi
  sleep 1
fi
redis-cli ping >/dev/null 2>&1 || die "redis is not reachable on localhost:6379"

log "ensuring database + role exist"
if [[ "$(uname -s)" == "Darwin" ]]; then
  PSQL_ADMIN=(psql -h localhost -U "$USER" -d postgres)
else
  PSQL_ADMIN=(sudo -u postgres psql -d postgres)
fi
"${PSQL_ADMIN[@]}" -tAc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 \
  || "${PSQL_ADMIN[@]}" -c "CREATE ROLE ${PG_USER} LOGIN PASSWORD '${PG_PASSWORD}';"
"${PSQL_ADMIN[@]}" -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 \
  || "${PSQL_ADMIN[@]}" -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};"

# ---------- 5. python deps + migrations ----------
if [[ ! -d .venv ]]; then
  log "creating python venv"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
log "installing python deps"
pip install --upgrade pip >/dev/null
pip install -e ".[dev]"

log "running alembic migrations"
alembic upgrade head

# ---------- 6. frontend deps ----------
log "installing frontend deps"
pushd frontend >/dev/null
if [[ ! -f .env.local ]]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi
npm install
popd >/dev/null

# ---------- 7. launch ----------
mkdir -p logs
log "starting uvicorn  (logs/backend.log)"
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > logs/backend.log 2>&1 &
echo $! > logs/backend.pid

log "starting next dev (logs/frontend.log)"
( cd frontend && nohup npm run dev > ../logs/frontend.log 2>&1 & echo $! > ../logs/frontend.pid )

sleep 3
log "done."
cat <<MSG

  backend  → http://localhost:8000/docs
  frontend → http://localhost:3000

  logs:  $PROJECT_DIR/logs/backend.log
         $PROJECT_DIR/logs/frontend.log

  to stop:
    kill \$(cat $PROJECT_DIR/logs/backend.pid)
    kill \$(cat $PROJECT_DIR/logs/frontend.pid)
MSG

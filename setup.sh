#!/usr/bin/env bash
# TaxiGuard — one-shot environment setup for new student contributors (macOS/Linux).
# Installs Node + Python deps, creates .env files from examples, and reports
# what secrets still need to be filled in by hand. Safe to re-run.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}==>${NC} $1"; }
warn()  { echo -e "${YELLOW}==>${NC} $1"; }
fail()  { echo -e "${RED}==>${NC} $1"; }

MISSING_SECRETS=()

check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required tool: $1 ($2)"
    exit 1
  fi
}

info "Checking prerequisites..."
check_cmd node "install Node.js 18+: https://nodejs.org"
check_cmd npm  "ships with Node.js"
check_cmd python3 "install Python 3.10+: https://www.python.org"
check_cmd git "install git"

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ required, found $(node -v)"
  exit 1
fi

# --- 1. Frontend dependencies ---------------------------------------------
info "Installing Node.js dependencies (npm install)..."
npm install

# --- 2. Frontend env file ---------------------------------------------------
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    info "Created .env.local from .env.example"
  else
    warn ".env.example not found — skipping .env.local creation"
  fi
else
  info ".env.local already exists — leaving it untouched"
fi

if [ -f .env.local ]; then
  grep -q "your_supabase_project_url\|your_supabase_anon_key\|your_supabase_service_role_key" .env.local 2>/dev/null && \
    MISSING_SECRETS+=(".env.local: Supabase URL/keys (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)")
fi

# --- 3. Python virtual environment for the Django vision backend ----------
if [ -d vision ]; then
  info "Setting up Python virtual environment for vision/ ..."
  if [ ! -d vision/venv ]; then
    python3 -m venv vision/venv
  fi
  # shellcheck disable=SC1091
  source vision/venv/bin/activate
  pip install --upgrade pip >/dev/null
  if [ -f vision/requirements.txt ]; then
    info "Installing Python dependencies (this can take a few minutes — ultralytics/torch are large)..."
    pip install -r vision/requirements.txt
  fi
  deactivate

  if [ ! -f vision/.env ]; then
    if [ -f vision/.env.example ]; then
      cp vision/.env.example vision/.env
      info "Created vision/.env from vision/.env.example"
    else
      warn "vision/.env.example not found — skipping vision/.env creation"
    fi
  else
    info "vision/.env already exists — leaving it untouched"
  fi

  if [ -f vision/.env ]; then
    grep -qi "your_qwen_api_key\|generate-a-random-secret-key\|your_service_role_key\|uuid-from" vision/.env 2>/dev/null && \
      MISSING_SECRETS+=("vision/.env: SECRET_KEY, QWEN_API_KEY, SUPABASE_SERVICE_ROLE_KEY, EXTERNAL_CHECKPOINT_ID, EXTERNAL_OPERATOR_ID")
  fi
else
  warn "vision/ directory not found — skipping backend setup"
fi

# --- 4. Camera bridge check (no extra install, shares vision/venv) --------
if [ -f edge/camera_bridge.py ]; then
  info "Camera bridge found at edge/camera_bridge.py (uses vision/venv — see STUDENT_GUIDE.md §3.1 before wiring up real hardware)"
fi

# --- 5. Summary -------------------------------------------------------------
echo
info "Setup complete."
echo
echo "Next steps:"
echo "  1. Read STUDENT_GUIDE.md before running anything else."
if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo
  warn "You still need to fill in these secrets by hand (ask a maintainer for Supabase/AI API credentials):"
  for s in "${MISSING_SECRETS[@]}"; do
    echo "   - $s"
  done
fi
echo
echo "  2. Run the Supabase SQL migrations in scripts/ (001 through 005, in order) via the Supabase SQL editor."
echo "  3. Create an admin account:    node scripts/create_admin.mjs"
echo "  4. Start everything:           npm run dev:all        (frontend + vision API)"
echo "                                 npm run dev:full        (adds the laptop webcam bridge)"
echo
echo "  To test with a real/IP camera or Raspberry Pi target, read STUDENT_GUIDE.md section 3"
echo "  (\"The real gaps\") first — the webcam path above is a dev convenience, not the deployment target."

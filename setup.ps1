# TaxiGuard — one-shot environment setup for new student contributors (Windows).
# Installs Node + Python deps, creates .env files from examples, and reports
# what secrets still need to be filled in by hand. Safe to re-run.

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Info($msg)  { Write-Host "==> $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "==> $msg" -ForegroundColor Yellow }
function Fail($msg)  { Write-Host "==> $msg" -ForegroundColor Red }

function Check-Cmd($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "Missing required tool: $cmd ($hint)"
        exit 1
    }
}

$MissingSecrets = @()

Info "Checking prerequisites..."
Check-Cmd node "install Node.js 18+: https://nodejs.org"
Check-Cmd npm  "ships with Node.js"
Check-Cmd python "install Python 3.10+: https://www.python.org"
Check-Cmd git "install git"

$nodeVersion = (node -v) -replace 'v',''
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
    Fail "Node.js 18+ required, found v$nodeVersion"
    exit 1
}

# --- 1. Frontend dependencies ---------------------------------------------
Info "Installing Node.js dependencies (npm install)..."
npm install

# --- 2. Frontend env file ---------------------------------------------------
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Info "Created .env.local from .env.example"
    } else {
        Warn ".env.example not found - skipping .env.local creation"
    }
} else {
    Info ".env.local already exists - leaving it untouched"
}

if (Test-Path ".env.local") {
    $content = Get-Content ".env.local" -Raw
    if ($content -match "your_supabase_project_url|your_supabase_anon_key|your_supabase_service_role_key") {
        $MissingSecrets += ".env.local: Supabase URL/keys (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"
    }
}

# --- 3. Python virtual environment for the Django vision backend ----------
if (Test-Path "vision") {
    Info "Setting up Python virtual environment for vision/ ..."
    if (-not (Test-Path "vision\venv")) {
        python -m venv vision\venv
    }
    & "vision\venv\Scripts\python.exe" -m pip install --upgrade pip | Out-Null
    if (Test-Path "vision\requirements.txt") {
        Info "Installing Python dependencies (this can take a few minutes - ultralytics/torch are large)..."
        & "vision\venv\Scripts\python.exe" -m pip install -r "vision\requirements.txt"
    }

    if (-not (Test-Path "vision\.env")) {
        if (Test-Path "vision\.env.example") {
            Copy-Item "vision\.env.example" "vision\.env"
            Info "Created vision/.env from vision/.env.example"
        } else {
            Warn "vision/.env.example not found - skipping vision/.env creation"
        }
    } else {
        Info "vision/.env already exists - leaving it untouched"
    }

    if (Test-Path "vision\.env") {
        $visionContent = Get-Content "vision\.env" -Raw
        if ($visionContent -match "your_qwen_api_key|generate-a-random-secret-key|your_service_role_key|uuid-from") {
            $MissingSecrets += "vision/.env: SECRET_KEY, QWEN_API_KEY, SUPABASE_SERVICE_ROLE_KEY, EXTERNAL_CHECKPOINT_ID, EXTERNAL_OPERATOR_ID"
        }
    }
} else {
    Warn "vision/ directory not found - skipping backend setup"
}

# --- 4. Camera bridge check -------------------------------------------------
if (Test-Path "edge\camera_bridge.py") {
    Info "Camera bridge found at edge\camera_bridge.py (uses vision\venv - see STUDENT_GUIDE.md section 3.1 before wiring up real hardware)"
}

# --- 5. Summary -------------------------------------------------------------
Write-Host ""
Info "Setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Read STUDENT_GUIDE.md before running anything else."
if ($MissingSecrets.Count -gt 0) {
    Write-Host ""
    Warn "You still need to fill in these secrets by hand (ask a maintainer for Supabase/AI API credentials):"
    foreach ($s in $MissingSecrets) {
        Write-Host "   - $s"
    }
}
Write-Host ""
Write-Host "  2. Run the Supabase SQL migrations in scripts/ (001 through 005, in order) via the Supabase SQL editor."
Write-Host "  3. Create an admin account:    node scripts/create_admin.mjs"
Write-Host "  4. Start everything:           npm run dev:all        (frontend + vision API)"
Write-Host "                                 npm run dev:full        (adds the laptop webcam bridge)"
Write-Host ""
Write-Host "  To test with a real/IP camera or Raspberry Pi target, read STUDENT_GUIDE.md section 3"
Write-Host "  (`"The real gaps`") first - the webcam path above is a dev convenience, not the deployment target."

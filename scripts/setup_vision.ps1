# Setup script for vision Django app (Windows PowerShell)
# Usage: Open PowerShell in repo root and run: ./scripts/setup_vision.ps1

$ErrorActionPreference = 'Stop'
$visionDir = Join-Path $PSScriptRoot "..\vision"
$venvDir = Join-Path $visionDir "venv"
$python = "python"

Write-Host "Setting up vision environment..."

if (-not (Test-Path $visionDir)) {
  Write-Error "Could not find vision directory at $visionDir"
  exit 1
}

# Create venv if missing
if (-not (Test-Path $venvDir)) {
  Write-Host "Creating virtual environment..."
  Push-Location $visionDir
  & $python -m venv venv
  Pop-Location
} else {
  Write-Host "Virtual environment already exists."
}

$venvPython = Join-Path $venvDir "Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  Write-Error "Python executable not found in venv: $venvPython"
  exit 1
}

# Upgrade pip and install requirements
Write-Host "Upgrading pip and installing requirements..."
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $visionDir "requirements.txt")

# Run Django migrations
Write-Host "Running Django migrations..."
Push-Location $visionDir
& $venvPython manage.py migrate

# Optionally create a superuser if env vars are set
if ($env:ADMIN_EMAIL -and $env:ADMIN_PASSWORD -and $env:ADMIN_USERNAME) {
  Write-Host "Creating Django superuser from env vars..."
  $env:DJANGO_SUPERUSER_EMAIL = $env:ADMIN_EMAIL
  $env:DJANGO_SUPERUSER_USERNAME = $env:ADMIN_USERNAME
  $env:DJANGO_SUPERUSER_PASSWORD = $env:ADMIN_PASSWORD
  & $venvPython manage.py createsuperuser --noinput || Write-Host "Create superuser might already exist or failed." 
} else {
  Write-Host "Skipping automatic superuser creation. Set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD env vars to enable."
}

Write-Host "Starting Django development server on 0.0.0.0:8000..."
Write-Host "(Press Ctrl+C to stop)"
& $venvPython manage.py runserver 0.0.0.0:8000
Pop-Location

# Helper to setup vision and start both Next and Django dev servers
# Usage: From repo root PowerShell: ./scripts/run_all.ps1

Write-Host "Running vision setup (this will start Django and block)."
Write-Host "If you want to run Next concurrently, open a second terminal and run 'npm run dev'."

# Start the vision setup which runs the Django server
& pwsh -NoProfile -ExecutionPolicy Bypass -Command "& './scripts/setup_vision.ps1'"

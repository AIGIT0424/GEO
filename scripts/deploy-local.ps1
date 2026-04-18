# GEO local deployment script (Windows PowerShell, no Docker)
# Usage (PowerShell):  powershell -ExecutionPolicy Bypass -File .\deploy-local.ps1
$ErrorActionPreference = "Stop"

$RepoUrl    = if ($env:GEO_REPO_URL) { $env:GEO_REPO_URL } else { "https://github.com/aigit0424/geo.git" }
$Branch     = if ($env:GEO_BRANCH)   { $env:GEO_BRANCH }   else { "claude/initialize-project-XAzlk" }
$Desktop    = [Environment]::GetFolderPath("Desktop")
$TargetDir  = Join-Path $Desktop "claude"
$ProjectDir = Join-Path $TargetDir "GEO"

$PgDb   = if ($env:PG_DB)       { $env:PG_DB }       else { "geo" }
$PgUser = if ($env:PG_USER)     { $env:PG_USER }     else { "geo" }
$PgPass = if ($env:PG_PASSWORD) { $env:PG_PASSWORD } else { "geo" }

function Log  ($m) { Write-Host "[geo] $m" -ForegroundColor Cyan }
function Die  ($m) { Write-Host "[geo] $m" -ForegroundColor Red; exit 1 }
function Need ($c) {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) {
    Die "missing dependency: $c (install it and re-run)"
  }
}

Log "checking dependencies..."
Need git; Need python; Need node; Need npm; Need psql; Need redis-cli

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

if (Test-Path (Join-Path $ProjectDir ".git")) {
  Log "repo already cloned — pulling latest"
  git -C $ProjectDir fetch origin $Branch
  git -C $ProjectDir checkout $Branch
  git -C $ProjectDir pull origin $Branch
} else {
  Log "cloning $RepoUrl into $ProjectDir"
  git clone --branch $Branch $RepoUrl $ProjectDir
}
Set-Location $ProjectDir

if (-not (Test-Path ".env")) {
  Log "creating .env"
  $secret = python -c "import secrets;print(secrets.token_urlsafe(48))"
  @"
APP_ENV=development
DEBUG=true
SECRET_KEY=$secret
DATABASE_URL=postgresql://${PgUser}:${PgPass}@localhost:5432/${PgDb}
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]
"@ | Out-File -Encoding ascii .env
}

Log "ensuring postgres/redis are reachable"
try { & pg_isready -h localhost -p 5432 | Out-Null } catch { Die "postgres not reachable on localhost:5432 (start the service first)" }
try { & redis-cli ping | Out-Null }                   catch { Die "redis not reachable on localhost:6379 (start the service first)" }

Log "ensuring database + role exist"
$env:PGPASSWORD = "postgres"
$roleExists = & psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PgUser'"
if ($roleExists -ne "1") {
  & psql -h localhost -U postgres -d postgres -c "CREATE ROLE $PgUser LOGIN PASSWORD '$PgPass';"
}
$dbExists = & psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$PgDb'"
if ($dbExists -ne "1") {
  & psql -h localhost -U postgres -d postgres -c "CREATE DATABASE $PgDb OWNER $PgUser;"
}

if (-not (Test-Path ".venv")) {
  Log "creating python venv"
  python -m venv .venv
}
$venvPython = Join-Path $ProjectDir ".venv\Scripts\python.exe"
$venvPip    = Join-Path $ProjectDir ".venv\Scripts\pip.exe"
$venvAlembic= Join-Path $ProjectDir ".venv\Scripts\alembic.exe"
$venvUvicorn= Join-Path $ProjectDir ".venv\Scripts\uvicorn.exe"

Log "installing python deps"
& $venvPip install --upgrade pip | Out-Null
& $venvPip install -e ".[dev]"

Log "running alembic migrations"
& $venvAlembic upgrade head

Log "installing frontend deps"
Push-Location frontend
if (-not (Test-Path ".env.local")) {
  "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -Encoding ascii .env.local
}
npm install
Pop-Location

New-Item -ItemType Directory -Force -Path logs | Out-Null

Log "starting uvicorn (logs\backend.log)"
Start-Process -FilePath $venvUvicorn `
  -ArgumentList "app.main:app","--host","0.0.0.0","--port","8000","--reload" `
  -WorkingDirectory $ProjectDir `
  -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend.err.log" `
  -WindowStyle Hidden

Log "starting next dev (logs\frontend.log)"
Start-Process -FilePath "npm" -ArgumentList "run","dev" `
  -WorkingDirectory (Join-Path $ProjectDir "frontend") `
  -RedirectStandardOutput (Join-Path $ProjectDir "logs\frontend.log") `
  -RedirectStandardError  (Join-Path $ProjectDir "logs\frontend.err.log") `
  -WindowStyle Hidden

Start-Sleep -Seconds 3
Log "done."
Write-Host ""
Write-Host "  backend  -> http://localhost:8000/docs"
Write-Host "  frontend -> http://localhost:3000"
Write-Host ""
Write-Host "  logs: $ProjectDir\logs\backend.log"
Write-Host "        $ProjectDir\logs\frontend.log"

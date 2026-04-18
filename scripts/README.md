# GEO Local Deployment

One-shot scripts that create `~/Desktop/claude/GEO`, install all dependencies,
initialize the database, and start the backend + frontend **without Docker**.

## Prerequisites

Install these once before running the script:

| Tool       | Version  | macOS (Homebrew)                    | Linux (Debian/Ubuntu)                                      | Windows                                             |
| ---------- | -------- | ----------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Git        | any      | `brew install git`                  | `sudo apt install git`                                     | <https://git-scm.com/download/win>                  |
| Python     | >= 3.11  | `brew install python@3.11`          | `sudo apt install python3.11 python3.11-venv python3-pip`  | <https://www.python.org/downloads/>                 |
| Node.js    | >= 20    | `brew install node@20`              | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install nodejs` | <https://nodejs.org/>            |
| PostgreSQL | >= 14    | `brew install postgresql@16 && brew services start postgresql@16` | `sudo apt install postgresql && sudo service postgresql start` | <https://www.postgresql.org/download/windows/> |
| Redis      | >= 6     | `brew install redis && brew services start redis` | `sudo apt install redis-server && sudo service redis-server start` | <https://github.com/microsoftarchive/redis/releases> or WSL |

## macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/aigit0424/geo/claude/initialize-project-XAzlk/scripts/deploy-local.sh -o /tmp/deploy-geo.sh
bash /tmp/deploy-geo.sh
```

Or, if you already cloned the repo:

```bash
bash scripts/deploy-local.sh
```

## Windows (PowerShell)

```powershell
# Run as your normal user (not Administrator)
Invoke-WebRequest `
  https://raw.githubusercontent.com/aigit0424/geo/claude/initialize-project-XAzlk/scripts/deploy-local.ps1 `
  -OutFile $env:TEMP\deploy-geo.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\deploy-geo.ps1
```

## What the script does

1. Checks for `git / python3 / node / npm / psql / redis-cli`.
2. Creates `~/Desktop/claude/` and clones GEO into it
   (branch `claude/initialize-project-XAzlk`).
3. Writes a `.env` with a freshly generated `SECRET_KEY`
   (existing `.env` is left alone).
4. Starts PostgreSQL / Redis if they are not already running, then
   creates the `geo` role + `geo` database if missing.
5. Creates `.venv/`, installs `pip install -e ".[dev]"`, runs
   `alembic upgrade head`.
6. Runs `npm install` in `frontend/` and writes `frontend/.env.local`
   pointing at `http://localhost:8000`.
7. Launches `uvicorn` and `npm run dev` in the background, logging to
   `logs/backend.log` and `logs/frontend.log`.

## After it finishes

- Backend docs: <http://localhost:8000/docs>
- Frontend:     <http://localhost:3000>

## Stop everything

macOS / Linux:

```bash
kill $(cat ~/Desktop/claude/GEO/logs/backend.pid)
kill $(cat ~/Desktop/claude/GEO/logs/frontend.pid)
```

Windows (PowerShell):

```powershell
Get-Process uvicorn, node -ErrorAction SilentlyContinue | Stop-Process
```

## Overrides

Environment variables you can set before running:

| Var              | Default                                        |
| ---------------- | ---------------------------------------------- |
| `GEO_REPO_URL`   | `https://github.com/aigit0424/geo.git`         |
| `GEO_BRANCH`     | `claude/initialize-project-XAzlk`              |
| `PG_DB`          | `geo`                                          |
| `PG_USER`        | `geo`                                          |
| `PG_PASSWORD`    | `geo`                                          |

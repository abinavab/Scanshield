# ScanShield

**Real-Time Security Log Monitoring & Brute-Force Detection System**

ScanShield is a defensive, cloud-ready security monitoring platform. An external device (a Kali Linux VM) sends login events to a REST API. The backend stores them in PostgreSQL, detects brute-force behaviour with a time-window rule, raises severity-graded alerts, and shows everything on a live React dashboard.

> **Lab use only.** The agent sends *synthetic* events to *your own* API. It does not attack any system.

## Table of contents
1. [Problem statement](#problem-statement)
2. [Objectives](#objectives)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Technology stack](#technology-stack)
6. [Project structure](#project-structure)
7. [Installation (local)](#installation-local)
8. [Configuration](#configuration)
9. [Database setup](#database-setup)
10. [Detection logic](#detection-logic)
11. [API endpoints](#api-endpoints)
12. [External agent setup](#external-agent-setup)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Security features](#security-features)
16. [Limitations](#limitations)
17. [Future improvements](#future-improvements)
18. [Author and licence](#author-and-licence)

## Problem statement
Brute-force login attempts hit every internet-facing service, yet failed-login records are scattered across devices and rarely reviewed in real time. Enterprise SIEM tools are powerful but costly and hard to learn from. ScanShield provides a small, explainable alternative: central collection, rule-based detection, clear alerts and an analyst workflow.

## Objectives
- Collect security events from an external device through a secure REST API.
- Store events, alerts, users and audit records in PostgreSQL.
- Detect brute-force behaviour with a configurable time-window rule.
- Generate alerts with LOW, MEDIUM, HIGH and CRITICAL severity.
- Display statistics, charts, events and alerts on a live dashboard.
- Apply secure-development practices and deploy to the cloud.

## Features
- Event ingestion: `login_success`, `login_failed`, `logout`, `suspicious_login`, `account_locked`
- Sliding time-window brute-force detection with configurable thresholds
- Alert workflow: OPEN, INVESTIGATING, RESOLVED
- Dashboard with 6 statistic cards, 5 charts, recent events and alerts, auto-refresh every 10 seconds
- Pages: Login, Dashboard, Events, Alerts, Devices
- Roles: ADMIN and ANALYST, with JWT login
- Kali agent with menu and command-line modes
- Automated tests (pytest), OpenAPI docs at `/docs`

## Architecture
```
Kali VM (security_agent.py)
        |  HTTPS POST /api/events  (X-API-Key)
        v
FastAPI backend --> Pydantic validation
        |--> Detection engine (time window) --> Alert
        v
PostgreSQL (users | security_events | alerts | audit_logs)
        v
React dashboard (JWT login) --> Security analyst
```

## Technology stack
| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL (SQLite for quick local tests) |
| Frontend | React, Vite, Recharts |
| Security | bcrypt, PyJWT, API key, CORS |
| External device | Kali Linux VM, Python `requests` |
| Tools | Git, GitHub, Postman, curl, pytest |
| Deployment | Render (API and database), Vercel (frontend) |

## Project structure
```
scanshield/
├── backend/      FastAPI app (app/), tests/, requirements.txt, .env.example
├── frontend/     React + Vite dashboard
├── agent/        security_agent.py (runs on Kali)
├── docs/         api.md, testing.md
├── .gitignore
├── LICENSE
└── README.md
```

## Installation (local)
Requirements: Python 3.12+, Node.js LTS, Git. PostgreSQL is optional locally.

**1. Clone**
```bash
git clone https://github.com/YOUR-USERNAME/scanshield.git
cd scanshield
```

**2. Backend** (Windows PowerShell)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit .env (see Configuration)
uvicorn app.main:app --reload
```
Check: http://localhost:8000/api/health returns `{"status":"ok","database":"connected"}`. Interactive docs: http://localhost:8000/docs

**3. Frontend** (new terminal)
```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```
Open http://localhost:5173 and sign in with the admin account from your `.env`.

## Configuration
Settings are read from environment variables (`backend/.env`). Never commit this file.

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Database connection (omit for local SQLite) | `postgresql://user:pass@localhost:5432/scanshield` |
| `SECRET_KEY` | Signs login tokens | long random value |
| `AGENT_API_KEY` | Key the agent must send | long random value |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin account | `admin` / strong password |
| `CORS_ORIGINS` | Allowed frontend URL(s) | `http://localhost:5173` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `60` |
| `WINDOW_SECONDS` | Detection window | `120` |
| `MEDIUM_THRESHOLD` | Failures for MEDIUM | `3` |
| `BRUTE_FORCE_THRESHOLD` | Failures for HIGH | `5` |
| `CRITICAL_THRESHOLD` | Failures for CRITICAL | `10` |

Generate a secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

Frontend: `VITE_API_URL` in `frontend/.env` points to the API (default `http://localhost:8000`).

## Database setup
Tables are created automatically at start-up.

| Table | Purpose |
|---|---|
| `users` | Analyst and admin accounts (hashed passwords, role) |
| `security_events` | Every received event, indexed on source IP, type and time |
| `alerts` | Detections with severity, attempts and status |
| `audit_logs` | Logins, user creation, alert changes |

For PostgreSQL, create an empty database named `scanshield` and set `DATABASE_URL`.

## Detection logic
For each `login_failed` event, ScanShield counts failed logins from the same source IP within the last `WINDOW_SECONDS` (default 120).

| Failed attempts in window | Alert type | Severity |
|---|---|---|
| 1 `suspicious_login` event | SUSPICIOUS_LOGIN | LOW |
| 3-4 | REPEATED_FAILURES | MEDIUM |
| 5-9 | BRUTE_FORCE | HIGH |
| 10 or more | BRUTE_FORCE | CRITICAL |

An existing open alert for the same IP is updated and escalated instead of duplicated.

## API endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | none | API and database status |
| POST | `/api/auth/login` | none | Obtain JWT |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/users` | JWT (ADMIN) | Create user |
| POST | `/api/events` | `X-API-Key` | Ingest an event |
| GET | `/api/events` | JWT | List events |
| GET | `/api/events/{id}` | JWT | One event |
| GET | `/api/alerts` | JWT | List alerts |
| GET | `/api/alerts/{id}` | JWT | One alert |
| PATCH | `/api/alerts/{id}` | JWT | Update alert status |
| GET | `/api/dashboard/stats` | JWT | Dashboard data |

Full details: [docs/api.md](docs/api.md).

Example event:
```json
{
  "username": "admin",
  "source_ip": "10.0.2.15",
  "event_type": "login_failed",
  "device_name": "Kali-VM",
  "operating_system": "Kali Linux",
  "message": "Failed login attempt"
}
```

## External agent setup
On the Kali VM (or any computer with Python):
```bash
cd agent
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env        # set API_URL and AGENT_API_KEY
python security_agent.py                          # interactive menu
python security_agent.py --mode burst --count 6   # one-shot test
```
`agent/.env`:
```
API_URL=https://YOUR-API-URL/api/events
AGENT_API_KEY=same-value-as-the-backend
```
Expected output: `[+] Event generated`, `[+] Sending event...`, `[+] API response: 201`, `[+] Event stored successfully`.

## Testing
```bash
cd backend
pytest -q
```
Ten automated tests cover health, invalid input, wrong API key, unauthorised access, event creation and retrieval, alert escalation (MEDIUM, HIGH, CRITICAL), resolving alerts, dashboard stats and role checks. The manual test plan is in [docs/testing.md](docs/testing.md).

## Deployment
| Component | Platform | Notes |
|---|---|---|
| PostgreSQL | Render | Copy the database URL into `DATABASE_URL` |
| FastAPI backend | Render web service | Root `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| React dashboard | Vercel | Root `frontend`, set `VITE_API_URL` to the Render URL |

After the frontend deploys, set `CORS_ORIGINS` on the backend to the exact frontend URL and redeploy.

**Live links** (fill in after deployment):
- Dashboard: `[ADD URL]`
- API: `[ADD URL]/docs`

## Security features
- Passwords hashed with bcrypt, never stored in plain text
- JWT tokens with expiry and role checks (ADMIN, ANALYST)
- API-key protection for the agent, compared in constant time
- Input validation with Pydantic (real IP address, allowed event types, length limits)
- SQL-injection prevention through the SQLAlchemy ORM
- CORS allow-list and secure HTTP headers
- Login rate limit (10 per minute per IP)
- Audit log; passwords are never logged
- All secrets in environment variables; `.env` is git-ignored

## Limitations
- Detection is per-IP; distributed or very slow attacks are not covered.
- Events are synthetic; real log collection is not implemented yet.
- The rate limiter is in-memory (single server instance).
- No email alerts, password reset or multi-factor authentication.
- Tables are created at start-up rather than through migrations.

## Future improvements
- Parse real logs such as `/var/log/auth.log` on lab machines
- Email, Slack or SMS alerts
- Alembic migrations, WebSocket live updates, Docker
- IP geolocation and threat-intelligence enrichment
- Per-username and distributed-attack detection

## Licence

Released under the MIT licence (see [LICENSE](LICENSE)).

# ReachInbox Email Scheduler

A production-grade email scheduler service + dashboard built as part of the ReachInbox hiring assignment. Accepts email send requests via APIs, schedules them using BullMQ delayed jobs (no cron), sends emails via Ethereal Email SMTP, and exposes a React dashboard for managing campaigns.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [How Scheduling Works](#how-scheduling-works)
- [Persistence & Restart Handling](#persistence--restart-handling)
- [Rate Limiting & Concurrency](#rate-limiting--concurrency)
- [Slack Integration](#slack-integration)
- [Elasticsearch Search](#elasticsearch-search)
- [API Endpoints](#api-endpoints)
- [Frontend Features](#frontend-features)
- [Demo Scenarios](#demo-scenarios)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Features

### Backend
- ✅ **Email Scheduling via BullMQ** — No cron jobs; uses BullMQ delayed jobs backed by Redis
- ✅ **Persistent Job Queue** — Survives server restarts; orphaned jobs are re-queued on startup
- ✅ **Multiple Senders** — Each sender gets a unique Ethereal Email test account
- ✅ **Rate Limiting** — Per-sender hourly rate limits using Redis atomic counters
- ✅ **Worker Concurrency** — Configurable BullMQ worker concurrency (default: 5)
- ✅ **Delay Between Emails** — Minimum 2-second delay between sends (configurable)
- ✅ **Idempotency** — Unique keys per email prevent duplicate sends
- ✅ **Elasticsearch Integration** — Full-text search across all emails
- ✅ **BullMQ Dashboard** — Real-time queue visibility at `/admin/queues`
- ✅ **Slack Notifications** — Real OAuth flow; notifies on rate limit hits
- ✅ **Google OAuth** — Real Google login (no mock)
- ✅ **CSV Upload** — Parse email leads from CSV/text files
- ✅ **Graceful Shutdown** — SIGINT/SIGTERM handlers for clean worker shutdown

### Frontend
- ✅ **Google Login** — Real OAuth with user avatar, name, email display
- ✅ **Dashboard** — Tabs for Scheduled and Sent emails with search
- ✅ **Compose Modal** — Schedule campaigns with CSV upload, sender selection, timing controls
- ✅ **Email Tables** — Paginated tables with status badges, loading states, empty states
- ✅ **Slack Connect** — OAuth popup flow to connect/disconnect Slack
- ✅ **Responsive Design** — Clean, modern UI with Tailwind CSS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│   Login → Dashboard → Compose → Scheduled/Sent Tables      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (axios)
┌──────────────────────────▼──────────────────────────────────┐
│                    Express.js Backend                        │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐ │
│  │  Auth    │  │  Email   │  │  Sender   │  │   Slack    │ │
│  │Controller│  │Controller│  │Controller │  │ Controller │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └─────┬──────┘ │
│       │              │              │              │         │
│  ┌────▼─────────────▼──────────────▼──────────────▼──────┐ │
│  │                   Service Layer                        │ │
│  │  AuthService │ EmailService │ QueueService │ SlackSvc  │ │
│  │  RateLimitService │ ElasticsearchService │ SenderSvc   │ │
│  └───────┬───────────────┬─────────────┬─────────────────┘ │
└──────────┼───────────────┼─────────────┼───────────────────┘
           │               │             │
     ┌─────▼─────┐  ┌─────▼─────┐ ┌─────▼─────┐
     │ PostgreSQL │  │   Redis   │ │Elasticsearch│
     │  (Prisma)  │  │  (BullMQ) │ │  (Search)  │
     └───────────┘  └─────┬─────┘ └───────────┘
                          │
                    ┌─────▼─────┐
                    │  BullMQ   │
                    │  Worker   │
                    │           │
                    │ • Rate    │
                    │   Check   │──→ Slack Notification
                    │ • Send    │
                    │   Email   │──→ Ethereal SMTP
                    │ • Index   │──→ Elasticsearch
                    │ • Update  │──→ PostgreSQL
                    └───────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Express.js + TypeScript |
| Job Queue | BullMQ (backed by Redis) |
| Database | PostgreSQL + Prisma ORM |
| Search Engine | Elasticsearch 8.x |
| Email SMTP | Ethereal Email (Nodemailer) |
| Auth | Google OAuth 2.0 + JWT |
| Slack | OAuth v2 + Web API |
| Queue Dashboard | Bull Board |
| Frontend | React 18 + TypeScript + Vite |
| CSS | Tailwind CSS |
| Infra | Docker Compose (Redis, PostgreSQL, Elasticsearch) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Google Cloud Console project (for OAuth Client ID)
- Slack App (optional, for Slack notifications)

### 1. Clone the repository

```bash
git clone <repo-url>
cd Email
```

### 2. Start infrastructure services

```bash
docker-compose up -d
```

This starts:
- **Redis** on port `6379` (with append-only persistence)
- **PostgreSQL** on port `5432` (user: `reachinbox`, pass: `reachinbox123`, db: `reachinbox`)
- **Elasticsearch** on port `9200` (single-node, security disabled)

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Google Client ID, JWT secret, etc.
npm install
npx prisma generate
npx prisma db push    # Creates tables in PostgreSQL
npm run dev
```

### 4. Setup Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_GOOGLE_CLIENT_ID=your-google-client-id
npm install
npm run dev
```

### 5. Access the application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **BullMQ Dashboard**: http://localhost:3001/admin/queues
- **Elasticsearch**: http://localhost:9200

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://reachinbox:reachinbox123@localhost:5432/reachinbox

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# BullMQ Worker Config
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000

# Rate Limiting (per sender per hour)
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Slack OAuth (optional)
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/api/slack/callback
```

### Frontend (`frontend/.env`)

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Setting up Ethereal Email

Ethereal Email accounts are **automatically created** when you add a new sender through the dashboard or API. No manual setup is required. Each sender gets a unique test SMTP account via `nodemailer.createTestAccount()`.

After an email is sent, the Ethereal preview URL is stored and displayed in the dashboard, allowing you to view the rendered email.

---

## How Scheduling Works

1. **User submits a campaign** via the Compose form (or POST `/api/emails/schedule`)
2. **Backend creates a Batch record** in PostgreSQL with all campaign metadata
3. **For each recipient**, an Email record is created with:
   - `scheduledAt = startTime + (index × delayBetweenSeconds)`
   - `idempotencyKey = "{batchId}:{recipient}:{index}"` (ensures uniqueness)
4. **A BullMQ delayed job** is added for each email:
   - `delay = max(0, scheduledAt - Date.now())` in milliseconds
   - The job data contains only `{ emailId }` — all state is in the DB
5. **When the delay expires**, the BullMQ worker picks up the job and:
   - Checks idempotency (skip if already SENT)
   - Checks per-sender hourly rate limit via Redis
   - If rate limited: reschedules to next available hour window
   - Otherwise: sends via Ethereal SMTP, updates DB, indexes in Elasticsearch

**No cron jobs are used anywhere.** All scheduling is driven by BullMQ delayed jobs.

---

## Persistence & Restart Handling

The system is designed to survive server restarts without data loss or duplicate sends:

### How it works:

1. **Redis persistence**: Redis is configured with append-only file (AOF) persistence. BullMQ jobs stored in Redis survive Redis restarts.

2. **Database as source of truth**: All email state is stored in PostgreSQL. The BullMQ job is just a trigger — the DB holds the canonical status.

3. **Startup job restoration**: When the server starts, `restoreJobsOnStartup()` runs:
   - Queries all emails with `status = 'SCHEDULED'` and `scheduledAt > now()`
   - For each, checks if its BullMQ job still exists in Redis
   - If the job is missing (e.g., Redis was flushed), creates a new delayed job with the correct remaining delay
   - Updates the `bullmqJobId` in the DB

4. **Idempotency protection**: Before sending, the worker checks the DB status. If an email is already `SENT`, the job is skipped. This prevents duplicate sends even if a job is somehow re-queued.

### Restart scenario:
```
1. Schedule 100 emails starting in 10 minutes
2. 30 emails are sent successfully
3. Server stops (kill process)
4. Server restarts
5. The remaining 70 emails are detected as SCHEDULED in DB
6. New BullMQ delayed jobs are created with correct remaining delays
7. Emails continue sending at the correct times — no duplicates, no gaps
```

---

## Rate Limiting & Concurrency

### Worker Concurrency

BullMQ worker is configured with `concurrency: 5` (configurable via `WORKER_CONCURRENCY`). This means up to 5 email jobs are processed in parallel. The worker logic is safe for parallel execution because:
- Each job operates on a different email record (no shared mutable state)
- Rate limit checks use Redis atomic `INCR` (thread-safe across workers/instances)
- Database updates target specific records by ID

### Delay Between Emails

A minimum delay of **2 seconds** (configurable via `MIN_DELAY_BETWEEN_EMAILS_MS`) is enforced between individual email sends. This is implemented at scheduling time:
- `scheduledAt[i] = startTime + (i × delayBetweenSeconds)`
- Each job has a unique delay, so they naturally fire at intervals

The user can also set a custom delay per campaign via the Compose form.

### Emails Per Hour (Rate Limiting)

**Per-sender hourly rate limiting** using Redis atomic counters:

```
Key:   ratelimit:{senderId}:{Math.floor(Date.now() / 3600000)}
Value: Atomic counter (INCR)
TTL:   3600 seconds (auto-expires after the hour window)
```

**When the hourly limit is reached:**
1. The job is **not dropped or failed** — it's rescheduled
2. The next available hour window is calculated
3. A new BullMQ delayed job is created with `delay = nextWindowStart - now`
4. The email's status is temporarily set to `RATE_LIMITED`
5. A **Slack notification** is sent (if connected) alerting the user

**Configuration:**
- `MAX_EMAILS_PER_HOUR_PER_SENDER=200` (default, configurable via env)
- Each campaign can also set its own `hourlyLimit` that is used if lower

### Behavior Under Load (1000+ emails)

When 1000+ emails are scheduled for roughly the same time:
1. BullMQ processes them with configured concurrency (5 parallel)
2. The first 200 (or configured limit) send normally within the hour
3. When the rate limit is hit, remaining jobs are rescheduled to the next hour
4. Slack notification fires once per sender when the limit is first reached
5. Order is preserved as much as possible (jobs reschedule with increasing delays)

---

## Slack Integration

### Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add OAuth scopes: `chat:write`, `channels:read`
3. Set the redirect URL to `http://localhost:3001/api/slack/callback`
4. Add `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` to backend `.env`

### How it works

1. User clicks **"Connect Slack"** in the dashboard
2. A popup opens with Slack's OAuth authorize page
3. User grants permission → Slack redirects to callback URL
4. Backend exchanges the auth code for an access token
5. Token and channel info are stored in the User record
6. When a sender's hourly rate limit is reached, a message is sent to the user's Slack:

   > ⚠️ Rate limit reached for sender user@ethereal.email: 200/200 emails sent this hour. Next emails will be delayed to the next hour window.

7. If Slack is not connected, rate limit hits simply log a warning (no crash)
8. User can disconnect and reconnect at any time without redeployment

---

## Elasticsearch Search

Emails are indexed in Elasticsearch on creation and after status updates. The `emails` index has mappings for:

- `recipient` (text + keyword)
- `subject` (text)
- `body` (text)
- `status` (keyword)
- `senderEmail` (keyword)
- `scheduledAt`, `sentAt` (date)

**Search endpoint**: `GET /api/emails/search?q=<query>`

Full-text search across recipient, subject, and body fields. Results are filtered by the authenticated user.

If Elasticsearch is unavailable, the service gracefully degrades — indexing operations log warnings but don't block email sending.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google` | Login with Google ID token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emails/schedule` | Schedule email campaign (JSON or multipart with CSV) |
| GET | `/api/emails/scheduled?page=1&limit=20` | Get scheduled emails (paginated) |
| GET | `/api/emails/sent?page=1&limit=20` | Get sent emails (paginated) |
| GET | `/api/emails/search?q=query` | Search emails via Elasticsearch |
| GET | `/api/emails/batches` | Get user's batches |

### Senders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/senders` | List user's senders |
| POST | `/api/senders` | Create new Ethereal sender |
| DELETE | `/api/senders/:id` | Delete a sender |

### Slack
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slack/connect` | Initiate Slack OAuth |
| GET | `/api/slack/callback` | Slack OAuth callback |
| GET | `/api/slack/status` | Check Slack connection status |
| DELETE | `/api/slack/disconnect` | Disconnect Slack |

### Infrastructure
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/admin/queues` | BullMQ Dashboard (Bull Board) |

---

## Frontend Features

### Pages & Components

| Feature | Description |
|---------|-------------|
| **Login Page** | Google OAuth login with gradient background, feature highlights |
| **Dashboard** | Tabs for Scheduled/Sent emails, search bar, compose button |
| **Compose Modal** | Subject, body, sender dropdown, CSV upload, timing controls |
| **Email Tables** | Paginated tables with status badges, Ethereal preview links |
| **Slack Connect** | OAuth popup flow, connection status, disconnect option |
| **Loading States** | Spinner indicators during data fetching |
| **Empty States** | Friendly messages when no data exists |
| **Error Handling** | Toast notifications for API errors |
| **Reusable Components** | Button, Input, Select, Modal, Badge, Table, Pagination, FileUpload, Tabs |

---

## Demo Scenarios

### 1. Schedule Emails via Dashboard
1. Login with Google
2. Create a sender (auto-provisions Ethereal account)
3. Click "Compose New Email"
4. Fill in subject, body, upload CSV with email addresses
5. Set start time, delay, hourly limit
6. Click "Schedule"
7. View emails in "Scheduled" tab → they move to "Sent" tab as they're processed

### 2. Restart Persistence
1. Schedule 20 emails with 5-second delay between each
2. Wait for a few to be sent
3. Stop the backend server (`Ctrl+C`)
4. Start it again (`npm run dev`)
5. Observe: remaining scheduled emails continue sending at correct times
6. No duplicates — already-sent emails are not re-sent

### 3. Rate Limiting
1. Set `MAX_EMAILS_PER_HOUR_PER_SENDER=5` in `.env`
2. Schedule 10 emails
3. First 5 send normally
4. At email #6, rate limit kicks in → job rescheduled to next hour
5. If Slack is connected, notification is sent

---

## Project Structure

```
Email/
├── docker-compose.yml
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/                # Configuration modules
│   │   │   ├── index.ts           # Central config
│   │   │   ├── database.ts        # Prisma client
│   │   │   ├── redis.ts           # IORedis connection
│   │   │   ├── queue.ts           # BullMQ queue + Bull Board
│   │   │   └── elasticsearch.ts   # ES client + index setup
│   │   ├── types/index.ts         # TypeScript interfaces
│   │   ├── middleware/auth.ts     # JWT auth middleware
│   │   ├── services/              # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── queue.service.ts
│   │   │   ├── sender.service.ts
│   │   │   ├── rateLimit.service.ts
│   │   │   ├── elasticsearch.service.ts
│   │   │   └── slack.service.ts
│   │   ├── controllers/           # Route handlers
│   │   ├── routes/                # Express routers
│   │   ├── workers/
│   │   │   └── email.worker.ts    # BullMQ email worker
│   │   └── index.ts               # Express app entry
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Reusable UI components
│   │   │   ├── layout/            # Header, Layout
│   │   │   ├── ComposeModal.tsx
│   │   │   ├── EmailTable.tsx
│   │   │   └── SlackConnect.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── context/AuthContext.tsx
│   │   ├── services/api.ts
│   │   ├── hooks/useEmails.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Assumptions & Trade-offs

1. **Ethereal Email auto-provisioning**: Senders get auto-created Ethereal accounts. In production, you'd configure real SMTP credentials per sender.

2. **Single-node Redis**: Rate limiting uses Redis INCR which is atomic on a single node. For multi-node Redis (cluster), you'd need Lua scripts or Redlock.

3. **Elasticsearch graceful degradation**: If ES is down, email sending continues — search just returns empty results. Indexing failures are logged but don't block operations.

4. **JWT-based auth**: Tokens are stored in localStorage. In production, consider HttpOnly cookies with CSRF protection.

5. **BullMQ rate limiting**: We use Redis-based manual counters rather than BullMQ's built-in `limiter` option for more granular per-sender control and the ability to reschedule (rather than just delay the entire queue).

6. **Delay between emails**: The delay is applied at scheduling time (each email gets a staggered `scheduledAt`), not at the worker level. This gives more predictable behavior and allows the delay to be customized per campaign.

7. **Slack notification frequency**: Rate limit notifications are sent once per sender per hour window to avoid notification spam.

8. **CSV parsing**: Supports CSV files with an `email` or `recipient` column header, and falls back to extracting any value that looks like an email address. Also supports plain text files with one email per line. A sample CSV is included at `sample-leads.csv`.

---

## Submission & Repository Setup

### GitHub Access
Per the assignment instructions, create a private GitHub repository, push this code, and grant collaborator access to:
- `Mitrajit`
- `Yadav036`

### Steps to Push to GitHub:
```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git add .
git commit -m "feat: complete ReachInbox full-stack email scheduler assignment"
git branch -M main
git push -u origin main
```

### Assignment Submission Form
Fill the official form with your repository link, demo video link, and candidate details:
- **Form URL**: [Assignment Submission Form](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)


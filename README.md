# Meeting Intelligence Service

> A production-grade REST API for recording, transcribing, and extracting actionable intelligence from meetings — built with **Node.js**, **TypeScript**, **Express.js**, and **Prisma**.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql)](https://www.postgresql.org/)

---

## Features

- 🔐 **JWT Authentication** — Stateless access + refresh token pair
- 📋 **Meeting Management** — Full CRUD with pagination
- 🎙️ **Transcript Storage** — Per-utterance transcript lines with speaker diarisation
- 🤖 **AI Analysis** — Structured JSON storage for summaries, decisions, follow-ups
- ✅ **Action Items** — Task tracking with assignees, due dates, and status workflow
- 🔔 **Reminder Logs** — Append-only delivery audit trail (Email, Slack, SMS, Webhook)
- 🛡️ **Security** — Helmet, CORS, rate limiting, Zod validation, bcrypt passwords
- 📊 **Observability** — Winston structured logging, Morgan HTTP logs, request IDs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.5 (strict mode) |
| Framework | Express.js 4.x |
| ORM | Prisma 5.x |
| Database | PostgreSQL 16 |
| Validation | Zod |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Password Hashing | bcrypt |
| Logging | Winston + Morgan |
| Code Quality | ESLint + Prettier |

---

## Project Structure

```
meeting-intelligence-service/
├── prisma/
│   └── schema.prisma          # Database schema (6 models)
├── src/
│   ├── app.ts                 # Express app factory
│   ├── server.ts              # Entry point + graceful shutdown
│   ├── config/
│   │   └── config.ts          # Zod-validated typed env config
│   ├── controllers/           # Request handlers + Zod schemas
│   │   ├── auth.controller.ts
│   │   └── meeting.controller.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts         # JWT verify + RBAC
│   │   ├── validate.middleware.ts     # Generic Zod validator
│   │   ├── error.middleware.ts        # Global error handler
│   │   └── request-logger.middleware.ts
│   ├── routes/                # Router definitions
│   │   ├── auth.routes.ts
│   │   ├── meeting.routes.ts
│   │   └── index.ts           # Root router + health probes
│   ├── services/              # Business logic
│   │   ├── auth.service.ts    # bcrypt + JWT
│   │   ├── database.service.ts # Prisma singleton
│   │   └── meeting.service.ts
│   ├── types/
│   │   └── index.ts           # Domain types + enums
│   └── utils/
│       ├── errors.ts          # Typed error hierarchy
│       ├── helpers.ts         # Utility functions
│       ├── logger.ts          # Winston logger
│       └── response.ts        # Standardised response helpers
├── .env.example               # Environment variable template
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- PostgreSQL 16 running locally or a connection string

### 1. Clone & install

```bash
git clone https://github.com/pratikcoder01/Meeting_Intelligence.git
cd Meeting_Intelligence
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in DATABASE_URL, JWT_SECRET, etc.
```

### 3. Run database migrations

```bash
# First-time setup
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### 4. Start development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login and receive tokens |
| POST | `/api/v1/auth/refresh` | Exchange refresh token |

### Meetings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/meetings` | ✅ | List meetings (paginated) |
| POST | `/api/v1/meetings` | ✅ | Create a meeting |
| GET | `/api/v1/meetings/:id` | ✅ | Get meeting details |
| PATCH | `/api/v1/meetings/:id` | ✅ | Update a meeting |
| DELETE | `/api/v1/meetings/:id` | ✅ | Delete a meeting |
| POST | `/api/v1/meetings/:id/cancel` | ✅ | Cancel a meeting |

---

## Database Schema

Six models with full relational integrity:

```
User ──< Meeting ──< TranscriptLine
              │
              ├──── MeetingAnalysis (1:1)
              │
              └──< ActionItem ──< ReminderLog
```

---

## Available Scripts

```bash
npm run dev             # Start dev server with hot reload
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled production server
npm run typecheck       # Type-check without emitting
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier format
npm run prisma:migrate  # Run DB migrations (dev)
npm run prisma:studio   # Open Prisma Studio
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32-char secret for JWT signing |
| `JWT_ACCESS_TOKEN_EXPIRY` | e.g. `15m` |
| `JWT_REFRESH_TOKEN_EXPIRY` | e.g. `7d` |
| `PORT` | HTTP port (default: `3000`) |
| `NODE_ENV` | `development` \| `production` \| `test` |

---

## License

MIT © Pratik

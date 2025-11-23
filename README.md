# 🧠 Options Paper Trading Platform (MVP)

A frictionless **paper trading simulator for options**, built for learning, competition, and fun — **no brokerage account required**.

This MVP simulates multi-leg option strategies with realistic execution logic (NBBO-based fills, spreads, margin rules, and early assignments) and includes a **public leaderboard** to foster a game-like community around trading performance.

---

## 🚀 Vision

Most existing paper trading systems are locked behind brokerage accounts or lack realistic execution.  
This project aims to be the **first open, broker-agnostic options simulator** combining:

- Realistic **execution & margin modeling**
- **Greeks / IV analytics**
- Public **leaderboards and social trading**
- Seamless **web-based onboarding**

---

## 🧩 Core Features (MVP)

| Category           | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **Trading Engine** | Multi-leg orders (limit & market)                                          |
| **Portfolio**      | Positions, Greeks, real-time P/L, and historical equity curve              |
| **Market Data**    | 15-min delayed quotes and Greeks (via vendor API, e.g., Databento/Polygon) |
| **Compliance**     | Educational use only, delayed-data banners, non-pro attestation            |

---

## 🏗️ Tech Stack

| Layer                    | Technology                                                                    | Purpose                                                      |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Frontend**             | [Next.js 14](https://nextjs.org/) (App Router)                                | React framework with SSR, routing, API routes                |
| **API Layer**            | [tRPC](https://trpc.io/)                                                      | End-to-end typesafe API (no code generation)                 |
| **UI Components**        | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS                            | Beautiful, accessible component library                      |
| **Database**             | PostgreSQL 16                                                                 | Primary data store (users, positions, orders, equity curves) |
| **ORM**                  | [Prisma](https://www.prisma.io/)                                              | Type-safe database client with migrations                    |
| **Cache / Leaderboards** | Redis 7                                                                       | Sorted sets for leaderboards, session cache, pub/sub         |
| **Greeks Service**       | [FastAPI](https://fastapi.tiangolo.com/) (Python)                             | Options math microservice (IV, Greeks calculations)          |
| **Market Data**          | [Massive](https://massive.com/docs/rest/quickstart) REST + ThetaData fallback | Options quotes, expirations, and underlying snapshots        |
| **Background Jobs**      | [BullMQ](https://docs.bullmq.io/)                                             | Task queue for portfolio recalculations, EOD processing      |
| **Validation**           | [Zod](https://zod.dev/)                                                       | Runtime type validation (shared with tRPC)                   |
| **Auth**                 | [NextAuth.js](https://next-auth.js.org/)                                      | Authentication (email, OAuth)                                |
| **Deployment**           | Docker Compose                                                                | Local dev + production containerization                      |
| **Monorepo**             | pnpm workspaces + Turbo                                                       | Fast builds, shared packages                                 |

---

## 🛰️ Market Data Modes

Use the `DATA_MODE` env var to control how failures are handled regardless of the provider:

- `auto` _(default)_ – try the selected provider first, log handled failures at `warn`, and fall back to mock data.
- `live` – always hit the selected provider and bubble `MarketDataError` responses to the UI (no fallback).
- `mock` – bypass external providers entirely for deterministic offline work and CI.

### Provider Selection

Set `MARKET_DATA_PROVIDER` to pick the live data source for **option chains**:

- `massive` _(default)_ – Massive REST API (`MASSIVE_API_URL`, `MASSIVE_API_KEY` required)
- `theta` – legacy ThetaData CSV endpoints (`THETA_API_URL`, Theta Terminal)

**Stock quotes** are fetched from EODHD (`EODHD_API_KEY` required) regardless of the selected provider. EODHD provides 15-minute delayed quotes for US stocks.

You can switch providers at runtime by changing the env var and restarting the server.

### Verifying Massive Connectivity

Before relying on live data, you can run a quick end-to-end check:

```bash
cd apps/web
MASSIVE_API_KEY=sk_your_key pnpm verify:massive SPY
```

The script hits the Massive REST API (expirations → option chain) and EODHD (underlying snapshot) and prints actionable errors if any step fails.

Set `THETA_DATA_VERBOSE_LOGS=true` to emit debug-level success logs when you need extra telemetry.
For Massive, supply `MASSIVE_API_KEY` and optionally override `MASSIVE_API_URL` (defaults to `https://api.massive.com/v2`).
For EODHD, supply `EODHD_API_KEY` (get yours at https://eodhd.com/register).

Invalid values cause the server to throw on startup with the list of valid options so misconfigurations are caught early.

---

## 🧪 Testing

```bash
cd apps/web
DATA_MODE=mock pnpm test
```

Vitest runs entirely against mocks by default (no Theta Terminal required). CI jobs should export `DATA_MODE=mock` before invoking `pnpm test` or `pnpm ts:check` to keep suites deterministic.

---

## 📁 Repository Structure

```
papertrader.io/
├── apps/
│   ├── web/                    # Next.js frontend + tRPC API routes
│   └── greeks-service/         # FastAPI Python microservice
├── packages/
│   ├── database/               # Prisma schema + migrations
│   ├── api/                    # tRPC router definitions
│   └── config/                 # Shared configs (TypeScript, ESLint, Tailwind)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

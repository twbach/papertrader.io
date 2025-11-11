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

| Category | Description |
|-----------|--------------|
| **Trading Engine** | Multi-leg orders (limit & market) |
| **Portfolio** | Positions, Greeks, real-time P/L, and historical equity curve |
| **Market Data** | 15-min delayed quotes and Greeks (via vendor API, e.g., Databento/Polygon) |
| **Compliance** | Educational use only, delayed-data banners, non-pro attestation |

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) | React framework with SSR, routing, API routes |
| **API Layer** | [tRPC](https://trpc.io/) | End-to-end typesafe API (no code generation) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS | Beautiful, accessible component library |
| **Database** | PostgreSQL 16 | Primary data store (users, positions, orders, equity curves) |
| **ORM** | [Prisma](https://www.prisma.io/) | Type-safe database client with migrations |
| **Cache / Leaderboards** | Redis 7 | Sorted sets for leaderboards, session cache, pub/sub |
| **Greeks Service** | [FastAPI](https://fastapi.tiangolo.com/) (Python) | Options math microservice (IV, Greeks calculations) |
| **Market Data** | [ThetaData](https://www.thetadata.net/) Terminal | NBBO quotes, Greeks, historical options data |
| **Background Jobs** | [BullMQ](https://docs.bullmq.io/) | Task queue for portfolio recalculations, EOD processing |
| **Validation** | [Zod](https://zod.dev/) | Runtime type validation (shared with tRPC) |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) | Authentication (email, OAuth) |
| **Deployment** | Docker Compose | Local dev + production containerization |
| **Monorepo** | pnpm workspaces + Turbo | Fast builds, shared packages |

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
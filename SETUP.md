# 🚀 Setup Guide

## Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- **Docker** and **Docker Compose**
- **ThetaData Terminal** (running on host machine)

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```

Edit `.env` and add your ThetaData credentials if needed.

### 3. Start Infrastructure (PostgreSQL + Redis + Greeks Service)

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 4. Set Up Database

Push Prisma schema to PostgreSQL:
```bash
cd packages/database
pnpm db:push
```

Or run migrations:
```bash
pnpm db:migrate
```

### 5. Start Next.js Dev Server

```bash
cd apps/web
pnpm dev
```

App will be available at: http://localhost:3000

---

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Next.js App** | http://localhost:3000 | Main web application |
| **tRPC API** | http://localhost:3000/api/trpc | API endpoint |
| **Greeks Service** | http://localhost:8000 | FastAPI Greeks calculator |
| **Postgres** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache/Leaderboards |
| **Theta Terminal** | http://localhost:25510 | Market data (run on host) |

---

## Development Workflow

### Run Everything (Turbo)

```bash
pnpm dev
```

### Database Commands

```bash
# Generate Prisma Client
cd packages/database && pnpm db:generate

# Push schema changes to DB
cd packages/database && pnpm db:push

# Create migration
cd packages/database && pnpm db:migrate

# Open Prisma Studio (GUI)
cd packages/database && pnpm db:studio
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart Greeks service
docker-compose restart greeks

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Test Greeks Service

```bash
curl http://localhost:8000/health

# Calculate Greeks for AAPL 150 Call expiring in 30 days
curl -X POST http://localhost:8000/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "underlying_price": 150.0,
    "strike": 155.0,
    "expiration": "2025-12-06",
    "option_type": "call",
    "volatility": 0.30
  }'
```

---

## Project Structure

```
papertrader.io/
├── apps/
│   ├── web/                    # Next.js app (frontend + API)
│   │   ├── src/
│   │   │   ├── app/           # Next.js 14 App Router
│   │   │   ├── server/        # tRPC routers
│   │   │   ├── lib/           # Utilities (tRPC client, utils)
│   │   │   └── components/    # React components
│   │   ├── auth.ts            # NextAuth.js config
│   │   └── middleware.ts      # NextAuth middleware
│   └── greeks-service/        # Python FastAPI microservice
│       ├── main.py            # FastAPI app
│       └── requirements.txt   # Python dependencies
├── packages/
│   └── database/              # Shared Prisma package
│       ├── schema.prisma      # Database schema
│       └── index.ts           # Prisma Client export
├── docker-compose.yml         # Infrastructure setup
├── turbo.json                 # Turborepo config
└── pnpm-workspace.yaml        # Monorepo workspace
```

---

## Troubleshooting

### Port Already in Use

If ports are occupied:
```bash
# Check what's using ports
lsof -i :3000
lsof -i :5432
lsof -i :6379
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Prisma Client Out of Sync

If you see "Prisma Client is out of sync" errors:
```bash
cd packages/database
pnpm db:generate
```

### Docker Container Won't Start

```bash
# Check logs
docker-compose logs greeks

# Rebuild containers
docker-compose up --build -d
```

### Can't Connect to ThetaData

Make sure Theta Terminal is running on your host machine and accessible at `http://localhost:25510`.

Test connection:
```bash
curl http://localhost:25510/v2/system/status
```

---

## Next Steps

1. ✅ Set up basic authentication (email/password)
2. ✅ Create user portfolio on signup
3. ✅ Build option chain viewer
4. ✅ Implement order placement
5. ✅ Add position tracking
6. ✅ Build P/L dashboard
7. ✅ Create leaderboard with Redis

Happy coding! 🎉

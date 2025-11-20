# Trade Storage & Exposure Plan

## 1. Objective
- Persist option trades initiated through the Papertrader UI so they can later power portfolio analytics, P&L, and compliance reporting.
- Provide a backend API that surfaces stored trades in a normalized format, enabling future UI work (portfolio/positions view).
- Ensure the solution is full-stack: inputs come from the current frontend order workflows, storage occurs server-side, and a read API exposes data for downstream consumers.

## 2. Current State & Gaps
- Orders currently exist only in-memory within the UI; once a dialog closes, trade details are lost.
- No database tables or Prisma models describe trades, legs, fills, or executions.
- The trpc router lacks mutations for creating trades and queries for retrieving them.
- The backend (FastAPI service) currently focuses on greeks; no trade persistence.

## 3. Requirements & Constraints
1. **Data Model**
   - Capture high-level trade metadata (id, user, strategy name, symbol, createdAt, status).
   - Store legs with option details (type, strike, expiration, quantity, price).
   - Support multi-leg spreads; each trade can have 1+ legs.
2. **Storage**
   - Use existing database stack (`packages/database` with Prisma + SQLite/Postgres).
   - Provide migration, schema updates, and generated client types.
3. **APIs**
   - **Create trade**: endpoint/mutation invoked by frontend after user confirms an order.
   - **List trades**: backend endpoint returning persisted trades (initial use case: portfolio section fetch, but API ready now).
   - For scope, omit update/cancel workflows; focus on immutable record insertion.
4. **Frontend Integration**
   - Extend the order placement logic to call the new create-trade mutation.
   - Ensure optimistic UI or error messaging for failed saves.
5. **Auth & Multi-user**
   - Assume existing auth (NextAuth) provides user IDs; trades must be partitioned per user.
6. **Testing**
   - Cover Prisma model logic and API endpoints with unit/integration tests (tRPC + database).

## 4. Implementation Plan
1. **Schema Design**
   - Update `packages/database/schema.prisma` with models:
     ```prisma
     model Trade {
       id           String   @id @default(cuid())
       userId       String
       symbol       String
       strategyName String?
       status       TradeStatus @default(PENDING)
       legs         TradeLeg[]
       createdAt    DateTime @default(now())
     }

     model TradeLeg {
       id         String @id @default(cuid())
       tradeId    String
       trade      Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)
       optionType OptionType
       expiration DateTime
       strike     Float
       quantity   Int
       price      Float
     }

     enum TradeStatus { PENDING FILLED CANCELLED }
     enum OptionType { CALL PUT }
     ```
   - Run `pnpm db:generate` after migrations.
2. **Backend Services**
   - If FastAPI will also store trades (for cross-service use), add matching Pydantic models and endpoints under `/trades`.
   - Decide ownership: if Next.js app handles persistence via Prisma, FastAPI can remain stateless; otherwise ensure consistent schema across both.
   - For now, prioritize Next.js backend (tRPC) for storage; integrate FastAPI only if real-time greeks service needs the data.
3. **tRPC Router Updates**
   - Create `apps/web/src/server/routers/trades.ts`:
     - `createTrade` mutation (input validated via zod, includes legs array).
     - `listTrades` query (supports pagination/filtering later; for now return latest N trades for current user).
   - Register router inside `_app.ts` to expose procedures to the client.
4. **Frontend Mutations**
   - Extend the order placement flow (likely `AddLegDialog`, `OptionsTable`, or a dedicated handler) to call `trpc.trades.createTrade.useMutation`.
   - Map UI state to the API schema: convert string dates to ISO, ensure numbers are parsed.
   - Handle mutation results (confirmation toast, error display).
   - Provide a stub hook or context for future portfolio components to call `trpc.trades.listTrades`.
5. **API for Portfolio Consumption**
   - Add REST-ish handler or dedicated tRPC query `getTrades` returning:
     ```ts
     type TradeWithLegs = {
       id: string;
       symbol: string;
       status: 'PENDING' | 'FILLED' | 'CANCELLED';
       createdAt: string;
       legs: {
         optionType: 'CALL' | 'PUT';
         expiration: string;
         strike: number;
         quantity: number;
         price: number;
       }[];
     };
     ```
   - Ensure the endpoint enforces user auth (server session) so only user-owned trades are returned.
6. **Testing**
   - Prisma model tests verifying relations cascade delete.
   - tRPC router tests (using a mocked context and sqlite in-memory DB) covering happy path + validation errors.
   - Frontend unit tests verifying the mutation payload shape.
7. **Documentation**
   - Update `README.md` + `SETUP.md` with migration instructions and API description.
   - Document API contract in `specs/order-placement-feature.md` or new spec file.

## 5. Future Enhancements (Out of Scope)
- Trade updates (fills, partial executions, commissions).
- Portfolio aggregation logic (net delta, theta, etc.).
- UI components for listing trades—will use the list API once portfolio section is built.

## 6. Acceptance Criteria
1. Prisma schema includes Trade + TradeLeg models with migrations applied.
2. `createTrade` mutation saves data; `listTrades` returns user-specific history.
3. Frontend order flow calls `createTrade` and surfaces errors.
4. REST/tRPC API for listing trades exists and is documented for the portfolio team.
5. Automated tests cover schema + API logic.

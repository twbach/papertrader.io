# Theta Data Integration Plan

## 1. Objective
- Replace the UI’s synthetic options chain data with live data from ThetaData while preserving the current mock dataset for offline development and deterministic testing.
- Introduce an environment-driven toggle that selects between `live` and `mock` data modes without requiring code changes or redeployments.

## 2. Current State
- `apps/web/src/lib/theta-client.ts` calls ThetaData REST endpoints and automatically falls back to mock helpers (`getMockExpirations`, `getMockOptionChain`, `getMockUnderlyingQuote`) whenever any request throws.
- `apps/web/src/server/routers/options.ts` is the only consumer of the client via tRPC procedures (`getExpirations`, `getOptionChain`, `getUnderlyingQuote`). All UI components call into these procedures.
- There is no explicit switch that forces mock-only behavior; developers must disconnect from Theta Terminal or induce failures to trigger the fallback. Automated tests therefore rely on the network stack, which is brittle.

## 3. Requirements & Constraints
1. **Environment flag**  
   - Introduce a value such as `THETA_DATA_MODE=mock|live|auto`.  
   - `mock`: always return synthetic data without touching Theta endpoints.  
   - `live`: always attempt Theta first; surface errors instead of silently falling back, so failures are visible.  
   - `auto` (default): best-effort live call with fallback to mock when the terminal is unavailable (mirrors today’s behavior).
2. **Non-breaking API**  
   - Keep the tRPC procedure signatures unchanged so the React components stay untouched.
3. **Observability**  
   - Emit structured logs noting the active mode and any fallbacks to aid debugging.
4. **Testability**  
   - Ensure unit/integration tests can inject the mode (e.g., via `process.env` or dependency inversion) to cover all code paths.

## 4. Implementation Plan
1. **Config Surface**
   - Define `THETA_DATA_MODE` and document it in `README.md`, `SETUP.md`, and a new `.env.example` entry if needed.
   - Decide whether the flag should be available to the browser bundle. Because data fetching occurs on the server/router layer, keep it server-side (no `NEXT_PUBLIC_` prefix).
2. **Create a Data Mode Helper**
   - Add `apps/web/src/lib/theta-config.ts` (or extend `theta-client.ts`) exporting:
     ```ts
     export type ThetaDataMode = 'live' | 'mock' | 'auto';
     export const getThetaDataMode = (): ThetaDataMode => { /* parse env with default */ };
     export const isMockOnly = () => getThetaDataMode() === 'mock';
     ```
   - Validate the env var at startup (throw on invalid values to catch misconfiguration early).
3. **Refactor `theta-client`**
   - Extract the existing REST calls into pure functions (e.g., `fetchExpirationsFromTheta`, `fetchOptionChainFromTheta`).
   - Wrap public functions to honor the mode:
     - `mock`: immediately return the mock payloads.
     - `live`: call Theta; if it errors, rethrow instead of `console.error` + fallback (ensures visibility).
     - `auto`: attempt live fetch, but on handled failures (network, 4xx/5xx, CSV parse) log a warning and use mock data.
   - Provide detailed logging when fallbacks happen, including symbol/expiration and the error message.
4. **Thread Mode Through Server Router**
   - Option A (simpler): keep the `theta-client` module stateful via `getThetaDataMode()` so router code stays untouched.
   - Option B (more explicit): let routers accept a data provider argument during initialization for easier testing. This requires small changes to `apps/web/src/server/routers/_app.ts` to pass the provider.
   - Choose Option A for speed unless tests require dependency injection, then refactor to Option B.
5. **Testing Strategy**
   - Add unit tests for `theta-client` helpers to ensure each mode behaves as expected (mock, live happy path, live failure).
   - Add an integration test (or Playwright mock) that sets `THETA_DATA_MODE=mock` and validates deterministic UI output without network calls.
   - Update CI scripts to run with `THETA_DATA_MODE=mock` so tests do not need Theta Terminal access.
6. **Documentation & Developer Experience**
   - Update `AGENTS.md` or project `README.md` with instructions on running the app in each mode, mentioning the dependency on Theta Terminal for `live`.
   - Call out that production deployments should set `THETA_DATA_MODE=live` and configure alerting for failed fetches (since there is no fallback).
   - Note that `THETA_API_URL` continues to control the base host/port.

## 5. Risks & Mitigations
- **Silent failures in live mode**: mitigate by throwing errors instead of swallowing them when `THETA_DATA_MODE=live`.
- **Developer confusion about defaults**: document that `auto` is the default and that mock data remains accessible even when Theta is running by explicitly setting `mock`.
- **Test brittleness**: ensure tests stub `fetch` or set the env var before importing `theta-client`, because modules capture env vars at import time.

## 6. Acceptance Criteria
1. `THETA_DATA_MODE` documented and respected at runtime.
2. `mock`, `live`, and `auto` behaviors validated via unit tests.
3. Real data is used in production when env var is `live`; mock data works without Theta Terminal when set to `mock`.
4. Developers can switch modes without code changes, and logs clarify which mode served each request.


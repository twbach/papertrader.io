## Market Data Provider Reference

### Current Endpoints

- `getExpirations(symbol)` – returns array of ISO-8601 strings filtered to future dates (max 20)
- `getOptionChain(symbol, expiration)` – returns `{ calls, puts }` arrays of `OptionQuote`
- `getUnderlyingQuote(symbol)` – returns `UnderlyingQuote` snapshot for the underlying

### Shared Contracts

```text
OptionQuote {
  strike: number
  expiration: string
  right: 'call' | 'put'
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  impliedVolatility?: number
}

UnderlyingQuote {
  symbol: string
  last: number
  bid: number
  ask: number
  change: number
  changePercent: number
}
```

### Mode Handling (`THETA_DATA_MODE`)

- `mock`: skip external HTTP calls and return deterministic mock helpers
- `auto`: try live data, fallback to mocks on `network|http|parse|auth|rate-limit` errors
- `live`: bubble errors to callers (surfaced through `MarketDataError`)

### Logging / Errors

- Live fetches emit JSON logs `{ source: 'market-data', provider, endpoint, symbol, expiration?, mode, requestId, durationMs, fallback, errorType?, message? }`
- Failures throw `MarketDataError` (wrapper around `MarketDataProviderError`) with endpoint, symbol, expiration, provider, mode, timestamp, errorType

### Consumers

- `apps/web/src/server/routers/options.ts` tRPC router (expirations, option chain, underlying quote)
- `apps/web/src/server/trpc.ts` formats `MarketDataError` details for API clients
- UI components import `OptionQuote` type (`components/options/OptionsTable.tsx`)

### Mock Data Helpers

- Expirations: weekly for next 8 weeks + mid-month for next 12 months (sorted, max 20)
- Option chain: generates strikes +/-$50 in $5 increments around synthetic price, random Greeks
- Underlying quote: seeded price map for `SPY`, `AAPL`, `TSLA`, `QQQ`, fallback to 100

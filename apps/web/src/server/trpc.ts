import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { MarketDataError } from '@/lib/market-data';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const marketData =
      error.cause instanceof MarketDataError
        ? {
            provider: error.cause.provider,
            endpoint: error.cause.endpoint,
            symbol: error.cause.symbol,
            expiration: error.cause.expiration,
            errorType: error.cause.errorType,
            mode: error.cause.mode,
            timestamp: error.cause.timestamp,
            requestId: error.cause.requestId,
            durationMs: error.cause.durationMs,
            metadata: error.cause.metadata,
          }
        : null;
    return {
      ...shape,
      data: {
        ...shape.data,
        marketData,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;

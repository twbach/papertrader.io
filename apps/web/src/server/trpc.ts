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
    const thetaData =
      error.cause instanceof MarketDataError
        ? {
            endpoint: error.cause.endpoint,
            errorType: error.cause.errorType,
            expiration: error.cause.expiration,
            mode: error.cause.mode,
            provider: error.cause.provider,
            requestId: error.cause.requestId,
            symbol: error.cause.symbol,
            timestamp: error.cause.timestamp,
          }
        : null;
    return {
      ...shape,
      data: {
        ...shape.data,
        theta: thetaData,
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

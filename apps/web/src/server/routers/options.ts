import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';
import {
  getExpirations,
  getOptionChain,
  getUnderlyingQuote,
  getCacheStats,
  MarketDataError,
} from '@/lib/market-data';
import NodeCache from 'node-cache';

export const optionsRouter = router({
  /**
   * Get available expiration dates for a symbol
   */
  getExpirations: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const expirations = await getExpirations(input.symbol);
        return { expirations };
      } catch (error) {
        throwMarketDataTrpcError(error);
      }
    }),

  /**
   * Get option chain (calls + puts) for a symbol and expiration
   */
  getOptionChain: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
        expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { calls, puts } = await getOptionChain(input.symbol, input.expiration);
        calls.sort((a, b) => a.strike - b.strike);
        puts.sort((a, b) => a.strike - b.strike);
        return { calls, puts };
      } catch (error) {
        throwMarketDataTrpcError(error);
      }
    }),

  /**
   * Get current underlying stock quote
   */
  getUnderlyingQuote: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const quote = await getUnderlyingQuote(input.symbol);
        return quote;
      } catch (error) {
        throwMarketDataTrpcError(error);
      }
    }),

  /**
   * Get market-data cache stats
   */
  getCacheStats: publicProcedure.query((): NodeCache.Stats => {
    return getCacheStats();
  }),
});

function throwMarketDataTrpcError(error: unknown): never {
  if (error instanceof MarketDataError) {
    const errorCode = mapMarketDataErrorTypeToTrpcCode(error.errorType);
    throw new TRPCError({
      code: errorCode,
      message: error.message,
      cause: error,
    });
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('Unknown market data error');
}

function mapMarketDataErrorTypeToTrpcCode(
  errorType: MarketDataError['errorType'],
): TRPCError['code'] {
  switch (errorType) {
    case 'rate-limit':
      return 'TOO_MANY_REQUESTS';
    case 'auth':
      return 'UNAUTHORIZED';
    case 'parse':
      return 'INTERNAL_SERVER_ERROR';
    case 'network':
    case 'http':
    default:
      return 'BAD_GATEWAY';
  }
}

import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';
import {
  getExpirations,
  getOptionChain,
  getUnderlyingQuote,
  MarketDataError,
} from '@/lib/market-data';

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
        throwThetaTrpcError(error);
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
        throwThetaTrpcError(error);
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
        throwThetaTrpcError(error);
      }
    }),
});

function throwThetaTrpcError(error: unknown): never {
  if (error instanceof MarketDataError) {
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: error.message,
      cause: error,
    });
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('Unknown Theta router error');
}

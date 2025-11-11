import { publicProcedure, router } from '../trpc';
import { z } from 'zod';
import {
  getExpirations,
  getOptionChain,
  getUnderlyingQuote,
} from '@/lib/theta-client';

export const optionsRouter = router({
  /**
   * Get available expiration dates for a symbol
   */
  getExpirations: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
      })
    )
    .query(async ({ input }) => {
      const expirations = await getExpirations(input.symbol);
      return { expirations };
    }),

  /**
   * Get option chain (calls + puts) for a symbol and expiration
   */
  getOptionChain: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
        expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const { calls, puts } = await getOptionChain(input.symbol, input.expiration);

      // Sort by strike
      calls.sort((a, b) => a.strike - b.strike);
      puts.sort((a, b) => a.strike - b.strike);

      return { calls, puts };
    }),

  /**
   * Get current underlying stock quote
   */
  getUnderlyingQuote: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1).max(10).toUpperCase(),
      })
    )
    .query(async ({ input }) => {
      const quote = await getUnderlyingQuote(input.symbol);
      return quote;
    }),
});

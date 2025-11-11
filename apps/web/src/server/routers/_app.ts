import { router } from '../trpc';
import { healthRouter } from './health';
import { optionsRouter } from './options';

export const appRouter = router({
  health: healthRouter,
  options: optionsRouter,
});

export type AppRouter = typeof appRouter;

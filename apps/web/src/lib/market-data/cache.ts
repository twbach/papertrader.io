import NodeCache from 'node-cache';
import type { MarketDataEndpoint } from './provider';

const CACHE_TTL_SECONDS = 60;
const CACHE_CHECK_PERIOD_SECONDS = 120;

const cache = new NodeCache({
  stdTTL: CACHE_TTL_SECONDS,
  checkperiod: CACHE_CHECK_PERIOD_SECONDS,
  useClones: false,
  deleteOnExpire: true,
});

export function getCacheKey(endpoint: MarketDataEndpoint, symbol: string, expiration?: string): string {
  if (expiration) {
    return `${endpoint}:${symbol}:${expiration}`;
  }
  return `${endpoint}:${symbol}`;
}

export function getCachedValue<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCachedValue<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function getCacheStats() {
  return cache.getStats();
}

export function flushCache(): void {
  cache.flushAll();
}


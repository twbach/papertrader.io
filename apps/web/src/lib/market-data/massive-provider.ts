import { randomUUID } from 'node:crypto';
import type { MarketDataEndpoint, MarketDataProvider, MarketDataProviderId } from './provider';
import type { OptionChainResult, OptionQuote, UnderlyingQuote } from './types';
import { MarketDataProviderError } from './errors';

const MASSIVE_PROVIDER_ID: MarketDataProviderId = 'massive';
const MASSIVE_BASE_URL = process.env.MASSIVE_API_URL || 'https://api.massive.com/v1';
const MASSIVE_FETCH_TIMEOUT_MS = 5000;
const SHOULD_LOG_VERBOSE = process.env.THETA_DATA_VERBOSE_LOGS === 'true';

const MASSIVE_ENDPOINTS = {
  expirations: '/options/expirations',
  optionChain: '/options/chain',
  underlyingQuote: '/stocks/quotes/latest',
} as const;

export function createMassiveProvider(): MarketDataProvider {
  return {
    id: MASSIVE_PROVIDER_ID,
    getExpirations,
    getOptionChain,
    getUnderlyingQuote,
  };
}

async function getExpirations(symbol: string): Promise<string[]> {
  const response = await executeMassiveRequest<unknown>({
    endpoint: 'expirations',
    path: MASSIVE_ENDPOINTS.expirations,
    params: { symbol },
  });
  const expirations = normalizeExpirations(response);
  if (expirations.length === 0) {
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: 'expirations',
      symbol,
      errorType: 'parse',
      requestId: randomUUID(),
      durationMs: 0,
      message: 'Massive response did not include any expirations',
    });
  }
  return expirations;
}

async function getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult> {
  const response = await executeMassiveRequest<unknown>({
    endpoint: 'option-chain',
    path: MASSIVE_ENDPOINTS.optionChain,
    params: { symbol, expiration },
    expiration,
  });
  return normalizeOptionChain(response, expiration);
}

async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  const response = await executeMassiveRequest<unknown>({
    endpoint: 'underlying-quote',
    path: MASSIVE_ENDPOINTS.underlyingQuote,
    params: { symbol },
  });
  return normalizeUnderlyingQuote(response, symbol);
}

interface MassiveRequestArgs {
  readonly endpoint: MarketDataEndpoint;
  readonly path: string;
  readonly params?: Record<string, string>;
  readonly expiration?: string;
}

async function executeMassiveRequest<T>(args: MassiveRequestArgs): Promise<T> {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    const apiKey = requireMassiveApiKey();
    const url = buildMassiveUrl(args.path, args.params);
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw buildHttpError(args, response.status, response.statusText, text, requestId, start);
    }
    if (SHOULD_LOG_VERBOSE) {
      logMassiveSuccess({
        endpoint: args.endpoint,
        symbol: args.params?.symbol ?? 'UNKNOWN',
        expiration: args.expiration,
        durationMs: Date.now() - start,
        requestId,
      });
    }
    return text.length ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    if (error instanceof MissingMassiveApiKeyError) {
      throw new MarketDataProviderError({
        provider: MASSIVE_PROVIDER_ID,
        endpoint: args.endpoint,
        symbol: args.params?.symbol ?? 'UNKNOWN',
        expiration: args.expiration,
        errorType: 'auth',
        requestId,
        durationMs: Date.now() - start,
        message: error.message,
      });
    }
    if (error instanceof MarketDataProviderError) {
      throw error;
    }
    throw buildNetworkError(args, error, requestId, start);
  }
}

function buildHttpError(
  args: MassiveRequestArgs,
  status: number,
  statusText: string,
  body: string,
  requestId: string,
  start: number,
): MarketDataProviderError {
  return new MarketDataProviderError({
    provider: MASSIVE_PROVIDER_ID,
    endpoint: args.endpoint,
    symbol: args.params?.symbol ?? 'UNKNOWN',
    expiration: args.expiration,
    errorType: mapMassiveStatusToError(status),
    requestId,
    durationMs: Date.now() - start,
    message: `Massive HTTP ${status} ${statusText}`,
    metadata: { status, statusText, bodySnippet: body.slice(0, 200) || undefined },
  });
}

function buildNetworkError(
  args: MassiveRequestArgs,
  cause: unknown,
  requestId: string,
  start: number,
): MarketDataProviderError {
  return new MarketDataProviderError({
    provider: MASSIVE_PROVIDER_ID,
    endpoint: args.endpoint,
    symbol: args.params?.symbol ?? 'UNKNOWN',
    expiration: args.expiration,
    errorType: 'network',
    requestId,
    durationMs: Date.now() - start,
    message: `Massive network failure for ${args.endpoint}`,
    cause: cause instanceof Error ? cause : undefined,
  });
}

function buildMassiveUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(path, MASSIVE_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MASSIVE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapMassiveStatusToError(status: number): 'http' | 'auth' | 'rate-limit' {
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 429) {
    return 'rate-limit';
  }
  return 'http';
}

function normalizeExpirations(payload: unknown): string[] {
  const collection = resolveResultArray(payload);
  return collection
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return typeof record.expiration === 'string'
          ? record.expiration
          : typeof record.date === 'string'
            ? record.date
            : '';
      }
      return '';
    })
    .filter((value): value is string => Boolean(value));
}

function normalizeOptionChain(payload: unknown, expiration: string): OptionChainResult {
  const entries = resolveResultArray(payload);
  const calls: OptionQuote[] = [];
  const puts: OptionQuote[] = [];
  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const record = entry as Record<string, unknown>;
    const quote: OptionQuote = {
      strike: parseNumber(record.strike ?? record.strike_price),
      expiration: (record.expiration as string) ?? expiration,
      right: parseRight(record.type ?? record.right),
      bid: parseNumber(record.bid),
      ask: parseNumber(record.ask),
      last: parseNumber(record.last ?? record.mark),
      volume: parseNumber(record.volume),
      openInterest: parseNumber(record.open_interest ?? record.openInterest),
      delta: parseNumber((record.greeks as Record<string, unknown> | undefined)?.delta),
      gamma: parseNumber((record.greeks as Record<string, unknown> | undefined)?.gamma),
      theta: parseNumber((record.greeks as Record<string, unknown> | undefined)?.theta),
      vega: parseNumber((record.greeks as Record<string, unknown> | undefined)?.vega),
      impliedVolatility: parseNumber(record.iv ?? record.implied_volatility),
    };
    if (quote.right === 'call') {
      calls.push(quote);
    } else {
      puts.push(quote);
    }
  });
  if (calls.length === 0 && puts.length === 0) {
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: 'option-chain',
      symbol: entries.length ? extractSymbol(entries[0]) : 'UNKNOWN',
      expiration,
      errorType: 'parse',
      requestId: randomUUID(),
      durationMs: 0,
      message: 'Massive option chain payload did not include any contracts',
    });
  }
  return { calls, puts };
}

function normalizeUnderlyingQuote(payload: unknown, symbol: string): UnderlyingQuote {
  const entries = resolveResultArray(payload);
  const quote = entries[0];
  if (!quote || typeof quote !== 'object') {
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: 'underlying-quote',
      symbol,
      errorType: 'parse',
      requestId: randomUUID(),
      durationMs: 0,
      message: 'Massive quote response missing data',
    });
  }
  const record = quote as Record<string, unknown>;
  return {
    symbol: (record.symbol as string) ?? symbol,
    last: parseNumber(record.last ?? record.close),
    bid: parseNumber(record.bid ?? record.best_bid),
    ask: parseNumber(record.ask ?? record.best_ask),
    change: parseNumber(record.change ?? record.day_change),
    changePercent: parseNumber(record.change_percent ?? record.day_change_percent),
  };
}

function resolveResultArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.results)) {
      return record.results;
    }
    if (Array.isArray(record.data)) {
      return record.data;
    }
  }
  return [];
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseRight(value: unknown): 'call' | 'put' {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'put' || normalized === 'p') {
    return 'put';
  }
  return 'call';
}

function extractSymbol(entry: unknown): string {
  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    if (typeof record.symbol === 'string') {
      return record.symbol;
    }
  }
  return 'UNKNOWN';
}

class MissingMassiveApiKeyError extends Error {}

function requireMassiveApiKey(): string {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new MissingMassiveApiKeyError(
      '[Massive] MASSIVE_API_KEY is required when using the Massive provider.',
    );
  }
  return apiKey;
}

interface MassiveSuccessPayload {
  readonly endpoint: MarketDataEndpoint;
  readonly symbol: string;
  readonly durationMs: number;
  readonly requestId: string;
  readonly expiration?: string;
}

function logMassiveSuccess(payload: MassiveSuccessPayload): void {
  const serialized = JSON.stringify({
    source: 'market-data',
    provider: MASSIVE_PROVIDER_ID,
    event: 'massive-request-success',
    endpoint: payload.endpoint,
    symbol: payload.symbol,
    expiration: payload.expiration,
    durationMs: payload.durationMs,
    requestId: payload.requestId,
  });
  console.debug(serialized);
}


import { randomUUID } from 'node:crypto';
import type { MarketDataEndpoint, MarketDataProvider, MarketDataProviderId } from './provider';
import type { OptionChainResult, OptionQuote, UnderlyingQuote } from './types';
import { MarketDataProviderError, type MarketDataErrorType } from './errors';
import { fetchEodhdUnderlyingQuote, EodhdError } from './eodhd-client';

const THETA_PROVIDER_ID: MarketDataProviderId = 'theta';
const THETA_BASE_URL = process.env.THETA_API_URL || 'http://0.0.0.0:25503/v3';
const FETCH_TIMEOUT_MS = 4500;
const MAX_EXPIRATIONS = 20;
const SHOULD_LOG_VERBOSE = process.env.THETA_DATA_VERBOSE_LOGS === 'true';

function buildThetaUrl(path: string, params: Record<string, string>): string {
  const encodedParams = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${THETA_BASE_URL}${path}?${encodedParams}`;
}

interface ThetaRequestContext {
  readonly endpoint: MarketDataEndpoint;
  readonly symbol: string;
  readonly expiration?: string;
}

interface ThetaLogPayload extends ThetaRequestContext {
  readonly durationMs: number;
  readonly requestId: string;
}

export function createThetaProvider(): MarketDataProvider {
  return {
    id: THETA_PROVIDER_ID,
    getExpirations,
    getOptionChain,
    getUnderlyingQuote,
  };
}

async function getExpirations(symbol: string): Promise<string[]> {
  const context: ThetaRequestContext = { endpoint: 'expirations', symbol };
  return executeThetaRequest(context, async () => {
    const url = buildThetaUrl('/option/list/expirations', { symbol });
    const csv = await fetchCsvFromTheta(url);
    const rows = parseCsvOrThrow(csv, context.endpoint);
    return filterExpirations(rows);
  });
}

async function getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult> {
  const context: ThetaRequestContext = { endpoint: 'option-chain', symbol, expiration };
  return executeThetaRequest(context, async () => {
    const formattedDate = expiration.replace(/-/g, '');
    const url = buildThetaUrl('/option/snapshot/quote', {
      symbol,
      expiration: formattedDate,
      format: 'csv',
    });
    const csv = await fetchCsvFromTheta(url);
    const rows = parseCsvOrThrow(csv, context.endpoint);
    return transformOptionRows(rows, expiration);
  });
}

async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  const context: ThetaRequestContext = { endpoint: 'underlying-quote', symbol };
  return executeThetaRequest(context, async () => {
    return fetchEodhdUnderlyingQuote(symbol);
  });
}

async function executeThetaRequest<T>(
  context: ThetaRequestContext,
  executor: () => Promise<T>,
): Promise<T> {
  const start = getTimestampMs();
  const requestId = randomUUID();
  try {
    const result = await executor();
    if (SHOULD_LOG_VERBOSE) {
      logThetaSuccess({ ...context, durationMs: Math.round(getTimestampMs() - start), requestId });
    }
    return result;
  } catch (error) {
    if (error instanceof ThetaRequestError) {
      throw new MarketDataProviderError({
        provider: THETA_PROVIDER_ID,
        endpoint: context.endpoint,
        symbol: context.symbol,
        expiration: context.expiration,
        errorType: error.errorType,
        requestId,
        durationMs: Math.round(getTimestampMs() - start),
        message: error.message,
        cause: error,
        metadata: error instanceof ThetaHttpError ? { status: error.status, statusText: error.statusText } : undefined,
      });
    }
    if (error instanceof EodhdError) {
      throw new MarketDataProviderError({
        provider: THETA_PROVIDER_ID,
        endpoint: context.endpoint,
        symbol: context.symbol,
        expiration: context.expiration,
        errorType: error.errorType,
        requestId,
        durationMs: Math.round(getTimestampMs() - start),
        message: error.message,
        cause: error,
      });
    }
    throw error;
  }
}

class ThetaRequestError extends Error {
  public readonly errorType: MarketDataErrorType;
  constructor(errorType: MarketDataErrorType, message: string, options?: ErrorOptions) {
    super(message, options);
    this.errorType = errorType;
  }
}

class ThetaNetworkError extends ThetaRequestError {
  constructor(message: string, options?: ErrorOptions) {
    super('network', message, options);
  }
}

class ThetaHttpError extends ThetaRequestError {
  public readonly status: number;
  public readonly statusText: string;
  public readonly bodySnippet?: string;
  constructor(args: { status: number; statusText: string; bodySnippet?: string }) {
    super('http', `Theta HTTP ${args.status} ${args.statusText}`);
    this.status = args.status;
    this.statusText = args.statusText;
    this.bodySnippet = args.bodySnippet;
  }
}

class ThetaParseError extends ThetaRequestError {
  constructor(message: string) {
    super('parse', message);
  }
}

function logThetaSuccess(payload: ThetaLogPayload): void {
  const serialized = JSON.stringify({
    source: 'theta-data',
    event: 'theta-request-success',
    durationMs: payload.durationMs,
    endpoint: payload.endpoint,
    symbol: payload.symbol,
    expiration: payload.expiration,
    requestId: payload.requestId,
  });
  console.debug(serialized);
}

async function fetchCsvFromTheta(url: string): Promise<string> {
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  if (!response.ok) {
    throw new ThetaHttpError({
      bodySnippet: text.slice(0, 200) || undefined,
      status: response.status,
      statusText: response.statusText,
    });
  }
  if (text.toLowerCase().includes('free subscription')) {
    throw new ThetaHttpError({
      bodySnippet: text.slice(0, 200) || undefined,
      status: response.status,
      statusText: 'FREE_SUBSCRIPTION',
    });
  }
  return text;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    throw new ThetaNetworkError(`Network failure while calling ${url}`, { cause });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseCsvOrThrow(csv: string, endpoint: MarketDataEndpoint): Record<string, string>[] {
  const trimmed = csv.trim();
  if (trimmed.length === 0) {
    throw new ThetaParseError(`Empty CSV payload for ${endpoint}`);
  }
  const lines = trimmed.split('\n');
  if (lines.length < 2) {
    throw new ThetaParseError(`No data rows for ${endpoint}`);
  }
  const headers = lines[0].split(',').map((header) => header.replace(/"/g, '').trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.replace(/"/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function filterExpirations(rows: Record<string, string>[]): string[] {
  const now = Date.now();
  const expirations = rows
    .map((row) => row.expiration)
    .filter((value): value is string => Boolean(value))
    .filter((value) => Date.parse(value) > now)
    .sort();
  return expirations.slice(0, MAX_EXPIRATIONS);
}

function transformOptionRows(rows: Record<string, string>[], expiration: string): OptionChainResult {
  const calls: OptionQuote[] = [];
  const puts: OptionQuote[] = [];
  rows.forEach((row) => {
    const quote: OptionQuote = {
      strike: parseNumber(row.strike),
      expiration: row.expiration || expiration,
      right: parseRight(row.right),
      bid: parseNumber(row.bid),
      ask: parseNumber(row.ask),
      last: parseNumber(row.last),
      volume: parseInt(row.volume || '0', 10),
      openInterest: parseInt(row.open_interest || '0', 10),
    };
    if (quote.right === 'call') {
      calls.push(quote);
    } else {
      puts.push(quote);
    }
  });
  return { calls, puts };
}

function parseRight(value?: string): 'call' | 'put' {
  return value?.toLowerCase() === 'put' ? 'put' : 'call';
}

function parseNumber(value?: string): number {
  const parsed = Number(value ?? '0');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTimestampMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}


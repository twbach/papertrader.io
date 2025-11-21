import { randomUUID } from 'node:crypto';
import { getThetaDataMode, ThetaDataMode } from './theta-config';

const THETA_BASE_URL = process.env.THETA_API_URL || 'http://0.0.0.0:25503/v3';
const FETCH_TIMEOUT_MS = 4500;
const MAX_EXPIRATIONS = 20;
const SHOULD_LOG_VERBOSE = process.env.THETA_DATA_VERBOSE_LOGS === 'true';

type ThetaEndpoint = 'expirations' | 'option-chain' | 'underlying-quote';
type ThetaLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ThetaErrorType = 'network' | 'http' | 'parse';

interface ThetaRequestContext {
  endpoint: ThetaEndpoint;
  symbol: string;
  expiration?: string;
}

interface ThetaLogPayload extends ThetaRequestContext {
  mode: ThetaDataMode;
  durationMs: number;
  fallback: boolean;
  requestId: string;
  errorType?: ThetaErrorType;
  message?: string;
}

const createTimestamp = (): string => new Date().toISOString();
const getTimestampMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export interface OptionQuote {
  strike: number;
  expiration: string;
  right: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  impliedVolatility?: number;
}

export interface UnderlyingQuote {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
}

class ThetaRequestError extends Error {
  public readonly errorType: ThetaErrorType;
  constructor(errorType: ThetaErrorType, message: string, options?: ErrorOptions) {
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

interface ThetaDataErrorArgs {
  context: ThetaRequestContext;
  thetaError: ThetaRequestError;
  mode: ThetaDataMode;
  durationMs: number;
  requestId: string;
}

export class ThetaDataError extends Error {
  public readonly errorType: ThetaErrorType;
  public readonly endpoint: ThetaEndpoint;
  public readonly symbol: string;
  public readonly expiration?: string;
  public readonly mode: ThetaDataMode;
  public readonly timestamp: string;
  public readonly durationMs: number;
  public readonly requestId: string;
  constructor(args: ThetaDataErrorArgs) {
    super(args.thetaError.message, { cause: args.thetaError });
    this.errorType = args.thetaError.errorType;
    this.endpoint = args.context.endpoint;
    this.symbol = args.context.symbol;
    this.expiration = args.context.expiration;
    this.mode = args.mode;
    this.durationMs = args.durationMs;
    this.requestId = args.requestId;
    this.timestamp = createTimestamp();
  }
}

export async function getExpirations(symbol: string): Promise<string[]> {
  const mode = getThetaDataMode();
  if (mode === 'mock') {
    return getMockExpirations();
  }
  try {
    return await fetchExpirationsFromTheta(symbol, mode);
  } catch (error) {
    return handleThetaFailure({
      endpoint: 'expirations',
      error,
      fallback: () => getMockExpirations(),
      mode,
      symbol,
    });
  }
}

export async function getOptionChain(
  symbol: string,
  expiration: string,
): Promise<{ calls: OptionQuote[]; puts: OptionQuote[] }> {
  const mode = getThetaDataMode();
  if (mode === 'mock') {
    return getMockOptionChain(symbol, expiration);
  }
  try {
    return await fetchOptionChainFromTheta(symbol, expiration, mode);
  } catch (error) {
    return handleThetaFailure({
      endpoint: 'option-chain',
      error,
      expiration,
      fallback: () => getMockOptionChain(symbol, expiration),
      mode,
      symbol,
    });
  }
}

export async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  const mode = getThetaDataMode();
  if (mode === 'mock') {
    return getMockUnderlyingQuote(symbol);
  }
  try {
    return await fetchUnderlyingQuoteFromTheta(symbol, mode);
  } catch (error) {
    return handleThetaFailure({
      endpoint: 'underlying-quote',
      error,
      fallback: () => getMockUnderlyingQuote(symbol),
      mode,
      symbol,
    });
  }
}

async function fetchExpirationsFromTheta(symbol: string, mode: ThetaDataMode): Promise<string[]> {
  const context: ThetaRequestContext = { endpoint: 'expirations', symbol };
  return executeThetaRequest(context, mode, async () => {
    const url = `${THETA_BASE_URL}/option/list/expirations?symbol=${symbol}`;
    const csv = await fetchCsvFromTheta(url);
    const rows = parseCsvOrThrow(csv, context.endpoint);
    return filterExpirations(rows);
  });
}

async function fetchOptionChainFromTheta(
  symbol: string,
  expiration: string,
  mode: ThetaDataMode,
): Promise<{ calls: OptionQuote[]; puts: OptionQuote[] }> {
  const context: ThetaRequestContext = { endpoint: 'option-chain', symbol, expiration };
  return executeThetaRequest(context, mode, async () => {
    const formattedDate = expiration.replace(/-/g, '');
    const url = `${THETA_BASE_URL}/option/snapshot/quote?symbol=${symbol}&expiration=${formattedDate}&format=csv`;
    const csv = await fetchCsvFromTheta(url);
    const rows = parseCsvOrThrow(csv, context.endpoint);
    return transformOptionRows(rows, expiration);
  });
}

async function fetchUnderlyingQuoteFromTheta(
  symbol: string,
  mode: ThetaDataMode,
): Promise<UnderlyingQuote> {
  const context: ThetaRequestContext = { endpoint: 'underlying-quote', symbol };
  return executeThetaRequest(context, mode, async () => {
    const url = `${THETA_BASE_URL}/stock/snapshot/quote?symbol=${symbol}&format=csv`;
    const csv = await fetchCsvFromTheta(url);
    const rows = parseCsvOrThrow(csv, context.endpoint);
    if (rows.length === 0) {
      throw new ThetaParseError('No underlying quote rows returned');
    }
    return buildUnderlyingQuote(symbol, rows[0]);
  });
}

async function executeThetaRequest<T>(
  context: ThetaRequestContext,
  mode: ThetaDataMode,
  executor: () => Promise<T>,
): Promise<T> {
  const start = getTimestampMs();
  const requestId = randomUUID();
  try {
    const result = await executor();
    if (SHOULD_LOG_VERBOSE) {
      logThetaEvent(
        'debug',
        buildLogPayload({
          context,
          durationMs: Math.round(getTimestampMs() - start),
          fallback: false,
          mode,
          requestId,
        }),
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ThetaRequestError) {
      throw new ThetaDataError({
        context,
        durationMs: Math.round(getTimestampMs() - start),
        mode,
        requestId,
        thetaError: error,
      });
    }
    throw error;
  }
}

interface LogPayloadArgs {
  context: ThetaRequestContext;
  durationMs: number;
  fallback: boolean;
  mode: ThetaDataMode;
  requestId: string;
  errorType?: ThetaErrorType;
  message?: string;
}

function buildLogPayload(args: LogPayloadArgs): ThetaLogPayload {
  return {
    durationMs: args.durationMs,
    endpoint: args.context.endpoint,
    expiration: args.context.expiration,
    fallback: args.fallback,
    mode: args.mode,
    requestId: args.requestId,
    symbol: args.context.symbol,
    errorType: args.errorType,
    message: args.message,
  };
}

interface ThetaFailureHandler<T> {
  endpoint: ThetaEndpoint;
  error: unknown;
  fallback: () => T;
  mode: ThetaDataMode;
  symbol: string;
  expiration?: string;
}

function handleThetaFailure<T>(handler: ThetaFailureHandler<T>): T {
  if (handler.error instanceof ThetaDataError) {
    const durationMs = handler.error.durationMs;
    const requestId = handler.error.requestId;
    if (handler.mode === 'auto') {
      logThetaEvent(
        'warn',
        buildLogPayload({
          context: {
            endpoint: handler.endpoint,
            expiration: handler.expiration,
            symbol: handler.symbol,
          },
          durationMs,
          errorType: handler.error.errorType,
          fallback: true,
          message: handler.error.message,
          mode: handler.mode,
          requestId,
        }),
      );
      return handler.fallback();
    }
    logThetaEvent(
      'error',
      buildLogPayload({
        context: {
          endpoint: handler.endpoint,
          expiration: handler.expiration,
          symbol: handler.symbol,
        },
        durationMs,
        errorType: handler.error.errorType,
        fallback: false,
        message: handler.error.message,
        mode: handler.mode,
        requestId,
      }),
    );
    throw handler.error;
  }
  throw handler.error;
}

function logThetaEvent(level: ThetaLogLevel, payload: ThetaLogPayload): void {
  const serialized = JSON.stringify({ source: 'theta-data', ...payload });
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  if (level === 'warn') {
    console.warn(serialized);
    return;
  }
  if (level === 'info') {
    console.info(serialized);
    return;
  }
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

function parseCsvOrThrow(csv: string, endpoint: ThetaEndpoint): Record<string, string>[] {
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

function transformOptionRows(
  rows: Record<string, string>[],
  expiration: string,
): { calls: OptionQuote[]; puts: OptionQuote[] } {
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
  const normalized = value?.toLowerCase() === 'put' ? 'put' : 'call';
  return normalized;
}

function parseNumber(value?: string): number {
  const parsed = Number(value ?? '0');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildUnderlyingQuote(symbol: string, row: Record<string, string>): UnderlyingQuote {
  return {
    symbol,
    last: parseNumber(row.last),
    bid: parseNumber(row.bid),
    ask: parseNumber(row.ask),
    change: parseNumber(row.change),
    changePercent: parseNumber(row.change_percent),
  };
}

function getMockExpirations(): string[] {
  const today = new Date();
  const expirations: string[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + i * 7);
    expirations.push(date.toISOString().split('T')[0]);
  }
  for (let i = 1; i <= 12; i += 1) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + i);
    date.setDate(15);
    expirations.push(date.toISOString().split('T')[0]);
  }
  return expirations.sort().slice(0, MAX_EXPIRATIONS);
}

function getMockOptionChain(
  symbol: string,
  expiration: string,
): { calls: OptionQuote[]; puts: OptionQuote[] } {
  const underlyingPrice = 450;
  const strikes = generateStrikes(underlyingPrice);
  const calls: OptionQuote[] = strikes.map((strike) =>
    buildMockOption(strike, expiration, 'call', underlyingPrice),
  );
  const puts: OptionQuote[] = strikes.map((strike) =>
    buildMockOption(strike, expiration, 'put', underlyingPrice),
  );
  return { calls, puts };
}

function buildMockOption(
  strike: number,
  expiration: string,
  right: 'call' | 'put',
  underlyingPrice: number,
): OptionQuote {
  const inTheMoney = right === 'call' ? strike < underlyingPrice : strike > underlyingPrice;
  const distance = Math.abs(strike - underlyingPrice);
  const basePremium = inTheMoney ? distance + 5 : Math.max(0.05, 20 - distance / 2);
  const last = basePremium;
  const bid = Math.max(0.01, last - 0.15);
  const ask = last + 0.15;
  const deltaBase = inTheMoney ? 0.6 : 0.1;
  const deltaVariance = Math.random() * 0.3;
  const signedDelta = right === 'call' ? deltaBase + deltaVariance : -(deltaBase + deltaVariance);
  return {
    strike,
    expiration,
    right,
    bid,
    ask,
    last,
    volume: Math.floor(Math.random() * 1000) + 100,
    openInterest: Math.floor(Math.random() * 5000) + 500,
    delta: signedDelta,
    gamma: 0.01 + Math.random() * 0.05,
    theta: -(0.05 + Math.random() * 0.15),
    vega: 0.1 + Math.random() * 0.2,
    impliedVolatility: 0.15 + Math.random() * 0.15,
  };
}

function getMockUnderlyingQuote(symbol: string): UnderlyingQuote {
  const prices: Record<string, number> = {
    SPY: 450.25,
    AAPL: 180.5,
    TSLA: 250.75,
    QQQ: 380,
  };
  const last = prices[symbol] || 100;
  return {
    symbol,
    last,
    bid: last - 0.05,
    ask: last + 0.05,
    change: -2.5,
    changePercent: -0.55,
  };
}

function generateStrikes(center: number): number[] {
  const strikes: number[] = [];
  const increment = 5;
  const range = 10;
  for (let i = -range; i <= range; i += 1) {
    strikes.push(center + i * increment);
  }
  return strikes;
}

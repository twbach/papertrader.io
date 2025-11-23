import { randomUUID } from 'node:crypto';
import { isAxiosError } from 'axios';
import {
  restClient,
  type DefaultApi,
  type GetOptionsChain200ResponseResultsInner,
  type ListOptionsContracts200ResponseResultsInner,
  GetOptionsChainOrderEnum,
  GetOptionsChainSortEnum,
  ListOptionsContractsOrderEnum,
  ListOptionsContractsSortEnum,
} from '@massive.com/client-js';
import type { MarketDataEndpoint, MarketDataProvider, MarketDataProviderId } from './provider';
import type { OptionChainResult, OptionQuote, UnderlyingQuote } from './types';
import { MarketDataProviderError } from './errors';
import { fetchEodhdUnderlyingQuote, EodhdError } from './eodhd-client';

const MASSIVE_PROVIDER_ID: MarketDataProviderId = 'massive';
const MASSIVE_BASE_URL = process.env.MASSIVE_API_URL || 'https://api.massive.com/v2';
const SHOULD_LOG_VERBOSE = process.env.THETA_DATA_VERBOSE_LOGS === 'true';
const MAX_EXPIRATIONS = 20;

let cachedClient: DefaultApi | null = null;

export function createMassiveProvider(): MarketDataProvider {
  return {
    id: MASSIVE_PROVIDER_ID,
    getExpirations,
    getOptionChain,
    getUnderlyingQuote,
  };
}

async function getExpirations(symbol: string): Promise<string[]> {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    const client = getMassiveClient();
    const response = await client.listOptionsContracts(
      symbol,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ListOptionsContractsOrderEnum.Asc,
      1000,
      ListOptionsContractsSortEnum.ExpirationDate,
    );
    if (SHOULD_LOG_VERBOSE) {
      logMassiveSuccess({
        endpoint: 'expirations',
        symbol,
        durationMs: Date.now() - start,
        requestId,
      });
    }
    const expirations = buildExpirationList(response.results ?? []);
    if (expirations.length === 0) {
      throw new MarketDataProviderError({
        provider: MASSIVE_PROVIDER_ID,
        endpoint: 'expirations',
        symbol,
        errorType: 'parse',
        requestId,
        durationMs: Date.now() - start,
        message: 'Massive response did not include any expirations',
      });
    }
    return expirations;
  } catch (error) {
    throw mapSdkError({ endpoint: 'expirations', symbol, requestId, start }, error);
  }
}

async function getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult> {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    const client = getMassiveClient();
    const response = await client.getOptionsChain(
      symbol,
      undefined,
      expiration,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      GetOptionsChainOrderEnum.Asc,
      1000,
      GetOptionsChainSortEnum.StrikePrice,
    );
    if (SHOULD_LOG_VERBOSE) {
      logMassiveSuccess({
        endpoint: 'option-chain',
        symbol,
        expiration,
        durationMs: Date.now() - start,
        requestId,
      });
    }
    const chain = buildOptionChain(response.results ?? [], expiration);
    if (chain.calls.length === 0 && chain.puts.length === 0) {
      throw new MarketDataProviderError({
        provider: MASSIVE_PROVIDER_ID,
        endpoint: 'option-chain',
        symbol,
        expiration,
        errorType: 'parse',
        requestId,
        durationMs: Date.now() - start,
        message: 'Massive option chain payload did not include any contracts',
      });
    }
    return chain;
  } catch (error) {
    throw mapSdkError({ endpoint: 'option-chain', symbol, expiration, requestId, start }, error);
  }
}

async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    const result = await fetchEodhdUnderlyingQuote(symbol);
    if (SHOULD_LOG_VERBOSE) {
      logMassiveSuccess({
        endpoint: 'underlying-quote',
        symbol,
        durationMs: Date.now() - start,
        requestId,
      });
    }
    return result;
  } catch (error) {
    throw mapSdkError({ endpoint: 'underlying-quote', symbol, requestId, start }, error);
  }
}

function buildExpirationList(results: ListOptionsContracts200ResponseResultsInner[]): string[] {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const expirations = new Set<string>();
  results.forEach((contract) => {
    if (!contract.expiration_date) {
      return;
    }
    const timestamp = Date.parse(contract.expiration_date);
    if (Number.isNaN(timestamp)) {
      return;
    }
    // Keep expirations that are today or in the future
    // Compare against start of today to include today's expirations
    if (timestamp >= todayStart) {
      expirations.add(contract.expiration_date);
    }
  });
  return Array.from(expirations).sort().slice(0, MAX_EXPIRATIONS);
}

function buildOptionChain(
  results: GetOptionsChain200ResponseResultsInner[],
  fallbackExpiration: string,
): OptionChainResult {
  const calls: OptionQuote[] = [];
  const puts: OptionQuote[] = [];
  results.forEach((option) => {
    const quote = mapOptionQuote(option, fallbackExpiration);
    if (quote.right === 'call') {
      calls.push(quote);
    } else {
      puts.push(quote);
    }
  });
  return { calls, puts };
}

function mapOptionQuote(
  option: GetOptionsChain200ResponseResultsInner,
  fallbackExpiration: string,
): OptionQuote {
  const details = option.details;
  const expiration = details?.expiration_date ?? fallbackExpiration;
  const right = details?.contract_type === 'put' ? 'put' : 'call';
  const lastQuote = option.last_quote;
  const lastTrade = option.last_trade;
  const day = option.day;
  const greeks = option.greeks;
  const last =
    (lastTrade?.price ?? day?.close ?? lastQuote?.midpoint ?? 0) ||
    0;
  return {
    strike: details?.strike_price ?? 0,
    expiration,
    right,
    bid: lastQuote?.bid ?? 0,
    ask: lastQuote?.ask ?? 0,
    last,
    volume: day?.volume ?? 0,
    openInterest: option.open_interest ?? 0,
    delta: greeks?.delta,
    gamma: greeks?.gamma,
    theta: greeks?.theta,
    vega: greeks?.vega,
    impliedVolatility: option.implied_volatility,
  };
}

type MassiveErrorContext = {
  endpoint: MarketDataEndpoint;
  symbol: string;
  requestId: string;
  start: number;
  expiration?: string;
};

function mapSdkError(context: MassiveErrorContext, error: unknown): never {
  if (error instanceof MarketDataProviderError) {
    throw error;
  }
  if (error instanceof EodhdError) {
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: context.endpoint,
      symbol: context.symbol,
      expiration: context.expiration,
      errorType: error.errorType,
      requestId: context.requestId,
      durationMs: Date.now() - context.start,
      message: error.message,
      cause: error,
    });
  }
  if (error instanceof MissingMassiveApiKeyError) {
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: context.endpoint,
      symbol: context.symbol,
      expiration: context.expiration,
      errorType: 'auth',
      requestId: context.requestId,
      durationMs: Date.now() - context.start,
      message: error.message,
    });
  }
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const errorType = mapHttpStatusToError(status);
    throw new MarketDataProviderError({
      provider: MASSIVE_PROVIDER_ID,
      endpoint: context.endpoint,
      symbol: context.symbol,
      expiration: context.expiration,
      errorType,
      requestId: context.requestId,
      durationMs: Date.now() - context.start,
      message: error.message,
      metadata: {
        status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      },
    });
  }
  throw new MarketDataProviderError({
    provider: MASSIVE_PROVIDER_ID,
    endpoint: context.endpoint,
    symbol: context.symbol,
    expiration: context.expiration,
    errorType: 'network',
    requestId: context.requestId,
    durationMs: Date.now() - context.start,
    message: error instanceof Error ? error.message : 'Unknown Massive SDK error',
    cause: error instanceof Error ? error : undefined,
  });
}

function mapHttpStatusToError(status?: number): 'http' | 'auth' | 'rate-limit' {
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 429) {
    return 'rate-limit';
  }
  return 'http';
}

function getMassiveClient(): DefaultApi {
  if (cachedClient) {
    return cachedClient;
  }
  const apiKey = requireMassiveApiKey();
  cachedClient = restClient(apiKey, MASSIVE_BASE_URL, { pagination: true });
  return cachedClient;
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


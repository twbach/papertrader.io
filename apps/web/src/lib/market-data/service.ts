import { getThetaDataMode, type ThetaDataMode } from '@/lib/theta-config';
import { getMockExpirations, getMockOptionChain, getMockUnderlyingQuote } from './mocks';
import { getMarketDataProvider } from './provider-factory';
import type { OptionChainResult, UnderlyingQuote } from './types';
import {
  MarketDataError,
  MarketDataProviderError,
  type MarketDataErrorType,
} from './errors';
import type { MarketDataEndpoint, MarketDataProviderId } from './provider';

export async function getExpirations(symbol: string): Promise<string[]> {
  const mode = getThetaDataMode();
  if (mode === 'mock') {
    return getMockExpirations();
  }
  try {
    return await getMarketDataProvider().getExpirations(symbol);
  } catch (error) {
    return handleProviderFailure({
      endpoint: 'expirations',
      error,
      fallback: getMockExpirations,
      mode,
      symbol,
    });
  }
}

export async function getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult> {
  const mode = getThetaDataMode();
  if (mode === 'mock') {
    return getMockOptionChain(symbol, expiration);
  }
  try {
    return await getMarketDataProvider().getOptionChain(symbol, expiration);
  } catch (error) {
    return handleProviderFailure({
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
    return await getMarketDataProvider().getUnderlyingQuote(symbol);
  } catch (error) {
    return handleProviderFailure({
      endpoint: 'underlying-quote',
      error,
      fallback: () => getMockUnderlyingQuote(symbol),
      mode,
      symbol,
    });
  }
}

interface FailureHandler<T> {
  readonly endpoint: MarketDataEndpoint;
  readonly error: unknown;
  readonly fallback: () => T;
  readonly mode: ThetaDataMode;
  readonly symbol: string;
  readonly expiration?: string;
}

function handleProviderFailure<T>(handler: FailureHandler<T>): T {
  if (handler.error instanceof MarketDataProviderError) {
    const normalizedError = new MarketDataError({
      provider: handler.error.provider,
      endpoint: handler.endpoint,
      symbol: handler.symbol,
      expiration: handler.expiration,
      errorType: handler.error.errorType,
      requestId: handler.error.requestId,
      durationMs: handler.error.durationMs,
      metadata: handler.error.metadata,
      message: handler.error.message,
      cause: handler.error,
      mode: handler.mode,
    });
    if (handler.mode === 'auto') {
      logMarketDataEvent('warn', {
        provider: handler.error.provider,
        endpoint: handler.endpoint,
        symbol: handler.symbol,
        expiration: handler.expiration,
        mode: handler.mode,
        requestId: handler.error.requestId,
        durationMs: handler.error.durationMs,
        fallback: true,
        errorType: handler.error.errorType,
        message: handler.error.message,
        metadata: handler.error.metadata,
      });
      return handler.fallback();
    }
    logMarketDataEvent('error', {
      provider: handler.error.provider,
      endpoint: handler.endpoint,
      symbol: handler.symbol,
      expiration: handler.expiration,
      mode: handler.mode,
      requestId: handler.error.requestId,
      durationMs: handler.error.durationMs,
      fallback: false,
      errorType: handler.error.errorType,
      message: handler.error.message,
      metadata: handler.error.metadata,
    });
    throw normalizedError;
  }
  throw handler.error;
}

type MarketDataLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface MarketDataLogPayload {
  readonly provider: MarketDataProviderId;
  readonly endpoint: MarketDataEndpoint;
  readonly symbol: string;
  readonly mode: ThetaDataMode;
  readonly requestId: string;
  readonly durationMs: number;
  readonly fallback: boolean;
  readonly errorType?: MarketDataErrorType;
  readonly message?: string;
  readonly expiration?: string;
  readonly metadata?: Record<string, unknown>;
}

function logMarketDataEvent(level: MarketDataLogLevel, payload: MarketDataLogPayload): void {
  const serialized = JSON.stringify({
    source: 'market-data',
    ...payload,
  });
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


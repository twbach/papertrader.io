import type { MarketDataMode } from '@/lib/market-data-config';
import type { MarketDataEndpoint, MarketDataProviderId } from './provider';

export type MarketDataErrorType = 'network' | 'http' | 'parse' | 'auth' | 'rate-limit' | 'validation';

export interface MarketDataProviderErrorArgs {
  readonly provider: MarketDataProviderId;
  readonly endpoint: MarketDataEndpoint;
  readonly symbol: string;
  readonly errorType: MarketDataErrorType;
  readonly requestId: string;
  readonly durationMs: number;
  readonly expiration?: string;
  readonly message?: string;
  readonly cause?: Error;
  readonly metadata?: Record<string, unknown>;
}

export class MarketDataProviderError extends Error {
  public readonly provider: MarketDataProviderId;
  public readonly endpoint: MarketDataEndpoint;
  public readonly symbol: string;
  public readonly expiration?: string;
  public readonly errorType: MarketDataErrorType;
  public readonly requestId: string;
  public readonly durationMs: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(args: MarketDataProviderErrorArgs) {
    super(args.message ?? 'Market data provider error', { cause: args.cause });
    this.provider = args.provider;
    this.endpoint = args.endpoint;
    this.symbol = args.symbol;
    this.expiration = args.expiration;
    this.errorType = args.errorType;
    this.requestId = args.requestId;
    this.durationMs = args.durationMs;
    this.metadata = args.metadata;
  }
}

interface MarketDataErrorArgs extends MarketDataProviderErrorArgs {
  readonly mode: MarketDataMode;
  readonly timestamp?: string;
}

export class MarketDataError extends Error {
  public readonly provider: MarketDataProviderId;
  public readonly endpoint: MarketDataEndpoint;
  public readonly symbol: string;
  public readonly expiration?: string;
  public readonly errorType: MarketDataErrorType;
  public readonly mode: MarketDataMode;
  public readonly timestamp: string;
  public readonly requestId: string;
  public readonly durationMs: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(args: MarketDataErrorArgs) {
    super(args.message, { cause: args.cause });
    this.provider = args.provider;
    this.endpoint = args.endpoint;
    this.symbol = args.symbol;
    this.expiration = args.expiration;
    this.errorType = args.errorType;
    this.mode = args.mode;
    this.timestamp = args.timestamp ?? new Date().toISOString();
    this.requestId = args.requestId;
    this.durationMs = args.durationMs;
    this.metadata = args.metadata;
  }
}


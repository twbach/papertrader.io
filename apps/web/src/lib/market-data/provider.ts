import type { OptionChainResult, UnderlyingQuote } from './types';

export type MarketDataEndpoint = 'expirations' | 'option-chain' | 'underlying-quote';

export type MarketDataProviderId = 'theta' | 'massive';

export interface MarketDataProvider {
  readonly id: MarketDataProviderId;
  getExpirations(symbol: string): Promise<string[]>;
  getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult>;
  getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote>;
}


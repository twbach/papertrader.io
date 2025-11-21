export type OptionRight = 'call' | 'put';

export interface OptionQuote {
  readonly strike: number;
  readonly expiration: string;
  readonly right: OptionRight;
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
  readonly openInterest: number;
  readonly delta?: number;
  readonly gamma?: number;
  readonly theta?: number;
  readonly vega?: number;
  readonly impliedVolatility?: number;
}

export interface OptionChainResult {
  readonly calls: OptionQuote[];
  readonly puts: OptionQuote[];
}

export interface UnderlyingQuote {
  readonly symbol: string;
  readonly last: number;
  readonly bid: number;
  readonly ask: number;
  readonly change: number;
  readonly changePercent: number;
}


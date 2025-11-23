import type { UnderlyingQuote } from './types';
import type { MarketDataErrorType } from './errors';

const EODHD_BASE_URL = 'https://eodhd.com/api';
const FETCH_TIMEOUT_MS = 4500;
const SHOULD_LOG_VERBOSE = process.env.THETA_DATA_VERBOSE_LOGS === 'true';

interface EodhdQuoteResponse {
  meta?: { count: number };
  data?: Record<string, EodhdQuoteData>;
  links?: { next: string | null };
}

interface EodhdQuoteData {
  symbol: string;
  exchange?: string;
  name?: string;
  lastTradePrice?: number;
  bidPrice?: number;
  askPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp?: number;
}

export class EodhdError extends Error {
  constructor(
    message: string,
    public readonly errorType: MarketDataErrorType,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'EodhdError';
  }
}

/**
 * Fetches delayed underlying quote from EODHD API
 * @param symbol - Stock symbol (without exchange suffix, e.g., "AAPL")
 * @returns UnderlyingQuote with price data
 * @throws EodhdError on network, HTTP, auth, or parse failures
 */
export async function fetchEodhdUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  const apiKey = requireEodhdApiKey();
  const symbolWithExchange = `${symbol}.US`;
  const url = `${EODHD_BASE_URL}/us-quote-delayed?s=${symbolWithExchange}&api_token=${apiKey}&fmt=json`;

  const start = Date.now();
  
  try {
    const response = await fetchWithTimeout(url);
    const text = await response.text();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new EodhdError(
          `EODHD authentication failed: ${response.status} ${response.statusText}`,
          'auth',
        );
      }
      throw new EodhdError(
        `EODHD HTTP error: ${response.status} ${response.statusText}`,
        'http',
      );
    }

    let data: EodhdQuoteResponse;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new EodhdError(
        'Failed to parse EODHD JSON response',
        'parse',
        { cause: error },
      );
    }

    const quote = data.data?.[symbolWithExchange];
    if (!quote) {
      throw new EodhdError(
        `No quote data returned for ${symbolWithExchange}`,
        'parse',
      );
    }

    const result = buildUnderlyingQuote(symbol, quote);

    if (SHOULD_LOG_VERBOSE) {
      logEodhdSuccess({
        symbol,
        durationMs: Date.now() - start,
      });
    }

    return result;
  } catch (error) {
    if (error instanceof EodhdError) {
      console.error(`[EODHD] Error fetching quote for ${symbol}:`, error.message, error.errorType);
      throw error;
    }
    const networkError = new EodhdError(
      `Network failure while calling EODHD API for ${symbol}`,
      'network',
      { cause: error },
    );
    console.error(`[EODHD] Network error for ${symbol}:`, error);
    throw networkError;
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    throw new EodhdError(
      `Network timeout or failure while calling EODHD API`,
      'network',
      { cause },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildUnderlyingQuote(symbol: string, data: EodhdQuoteData): UnderlyingQuote {
  return {
    symbol,
    last: data.lastTradePrice ?? 0,
    bid: data.bidPrice ?? 0,
    ask: data.askPrice ?? 0,
    change: data.change ?? 0,
    changePercent: data.changePercent ?? 0,
  };
}

function requireEodhdApiKey(): string {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new EodhdError(
      'EODHD_API_KEY environment variable is required but not set. ' +
        'Get your API key at https://eodhd.com/register',
      'auth',
    );
  }
  return apiKey.trim();
}

interface EodhdLogPayload {
  readonly symbol: string;
  readonly durationMs: number;
}

function logEodhdSuccess(payload: EodhdLogPayload): void {
  const serialized = JSON.stringify({
    source: 'eodhd-client',
    event: 'eodhd-request-success',
    symbol: payload.symbol,
    durationMs: payload.durationMs,
  });
  console.debug(serialized);
}


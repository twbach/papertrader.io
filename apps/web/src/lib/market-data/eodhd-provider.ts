import type { MarketDataProvider, MarketDataProviderId } from './provider';
import type { OptionChainResult, UnderlyingQuote } from './types';
import { MarketDataProviderError } from './errors';
import { fetchEodhdUnderlyingQuote, EodhdError } from './eodhd-client';
import { randomUUID } from 'node:crypto';

const EODHD_PROVIDER_ID: MarketDataProviderId = 'eodhd';

export function createEodhdProvider(): MarketDataProvider {
    return {
        id: EODHD_PROVIDER_ID,
        getExpirations,
        getOptionChain,
        getUnderlyingQuote,
    };
}

async function getExpirations(symbol: string): Promise<string[]> {
    throw new MarketDataProviderError({
        provider: EODHD_PROVIDER_ID,
        endpoint: 'expirations',
        symbol,
        errorType: 'validation',
        requestId: randomUUID(),
        durationMs: 0,
        message: 'EODHD provider does not support options data (expirations).',
    });
}

async function getOptionChain(symbol: string, expiration: string): Promise<OptionChainResult> {
    throw new MarketDataProviderError({
        provider: EODHD_PROVIDER_ID,
        endpoint: 'option-chain',
        symbol,
        expiration,
        errorType: 'validation',
        requestId: randomUUID(),
        durationMs: 0,
        message: 'EODHD provider does not support options data (option chain).',
    });
}

async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
    const start = Date.now();
    try {
        return await fetchEodhdUnderlyingQuote(symbol);
    } catch (error) {
        if (error instanceof EodhdError) {
            throw new MarketDataProviderError({
                provider: EODHD_PROVIDER_ID,
                endpoint: 'underlying-quote',
                symbol,
                errorType: error.errorType,
                requestId: randomUUID(), // eodhd-client doesn't return request ID currently, could improve later
                durationMs: Date.now() - start,
                message: error.message,
                cause: error,
            });
        }
        throw new MarketDataProviderError({
            provider: EODHD_PROVIDER_ID,
            endpoint: 'underlying-quote',
            symbol,
            errorType: 'network',
            requestId: randomUUID(),
            durationMs: Date.now() - start,
            message: error instanceof Error ? error.message : 'Unknown EODHD error',
            cause: error instanceof Error ? error : undefined,
        });
    }
}

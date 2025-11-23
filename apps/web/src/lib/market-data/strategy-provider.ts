import type { MarketDataProvider, MarketDataProviderId } from './provider';
import type { OptionChainResult, UnderlyingQuote } from './types';

const STRATEGY_PROVIDER_ID: MarketDataProviderId = 'strategy';

export interface StrategyProviderConfig {
    optionsProvider: MarketDataProvider;
    stockProvider: MarketDataProvider;
}

export function createStrategyProvider(config: StrategyProviderConfig): MarketDataProvider {
    const { optionsProvider, stockProvider } = config;

    return {
        id: STRATEGY_PROVIDER_ID,
        getExpirations: (symbol) => optionsProvider.getExpirations(symbol),
        getOptionChain: (symbol, expiration) => optionsProvider.getOptionChain(symbol, expiration),
        getUnderlyingQuote: (symbol) => stockProvider.getUnderlyingQuote(symbol),
    };
}

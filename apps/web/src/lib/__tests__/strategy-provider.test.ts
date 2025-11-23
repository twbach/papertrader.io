import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStrategyProvider } from '../market-data/strategy-provider';
import type { MarketDataProvider } from '../market-data/provider';
import type { OptionChainResult, UnderlyingQuote } from '../market-data/types';

describe('StrategyMarketDataProvider', () => {
    const mockOptionsProvider: MarketDataProvider = {
        id: 'massive',
        getExpirations: vi.fn(),
        getOptionChain: vi.fn(),
        getUnderlyingQuote: vi.fn(),
    };

    const mockStockProvider: MarketDataProvider = {
        id: 'eodhd',
        getExpirations: vi.fn(),
        getOptionChain: vi.fn(),
        getUnderlyingQuote: vi.fn(),
    };

    const strategy = createStrategyProvider({
        optionsProvider: mockOptionsProvider,
        stockProvider: mockStockProvider,
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should have id "strategy"', () => {
        expect(strategy.id).toBe('strategy');
    });

    it('should route getExpirations to options provider', async () => {
        const symbol = 'AAPL';
        const expected = ['2023-01-01'];
        vi.mocked(mockOptionsProvider.getExpirations).mockResolvedValue(expected);

        const result = await strategy.getExpirations(symbol);

        expect(mockOptionsProvider.getExpirations).toHaveBeenCalledWith(symbol);
        expect(mockStockProvider.getExpirations).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('should route getOptionChain to options provider', async () => {
        const symbol = 'AAPL';
        const expiration = '2023-01-01';
        const expected: OptionChainResult = { calls: [], puts: [] };
        vi.mocked(mockOptionsProvider.getOptionChain).mockResolvedValue(expected);

        const result = await strategy.getOptionChain(symbol, expiration);

        expect(mockOptionsProvider.getOptionChain).toHaveBeenCalledWith(symbol, expiration);
        expect(mockStockProvider.getOptionChain).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('should route getUnderlyingQuote to stock provider', async () => {
        const symbol = 'AAPL';
        const expected: UnderlyingQuote = {
            symbol: 'AAPL',
            last: 150,
            bid: 149,
            ask: 151,
            change: 1,
            changePercent: 0.6,
        };
        vi.mocked(mockStockProvider.getUnderlyingQuote).mockResolvedValue(expected);

        const result = await strategy.getUnderlyingQuote(symbol);

        expect(mockStockProvider.getUnderlyingQuote).toHaveBeenCalledWith(symbol);
        expect(mockOptionsProvider.getUnderlyingQuote).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });
});

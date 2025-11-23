import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMarketDataProvider } from '../market-data/provider-factory';

const mockMassiveClient = {
  listOptionsContracts: vi.fn(),
  getOptionsChain: vi.fn(),
  getStocksSnapshotTicker: vi.fn(),
};

vi.mock('@massive.com/client-js', async () => {
  const actual = await vi.importActual<typeof import('@massive.com/client-js')>(
    '@massive.com/client-js',
  );
  return {
    ...actual,
    restClient: vi.fn(() => mockMassiveClient),
  };
});

const originalMode = process.env.DATA_MODE;
const originalProvider = process.env.MARKET_DATA_PROVIDER;
const originalMassiveKey = process.env.MASSIVE_API_KEY;

beforeEach(() => {
  process.env.MARKET_DATA_PROVIDER = originalProvider;
  process.env.MASSIVE_API_KEY = originalMassiveKey;
});

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.DATA_MODE;
  } else {
    process.env.DATA_MODE = originalMode;
  }
  if (originalProvider === undefined) {
    delete process.env.MARKET_DATA_PROVIDER;
  } else {
    process.env.MARKET_DATA_PROVIDER = originalProvider;
  }
  if (originalMassiveKey === undefined) {
    delete process.env.MASSIVE_API_KEY;
  } else {
    process.env.MASSIVE_API_KEY = originalMassiveKey;
  }
  mockMassiveClient.listOptionsContracts.mockReset();
  mockMassiveClient.getOptionsChain.mockReset();
  mockMassiveClient.getStocksSnapshotTicker.mockReset();
  vi.restoreAllMocks();
  vi.resetModules();
  setMarketDataProvider(null);
});

describe('market-data service', () => {
  it('bypasses fetch when mode is mock', async () => {
    process.env.DATA_MODE = 'mock';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(expirations.length).toBeGreaterThan(0);
  });

  it('returns live expirations when Theta responds', async () => {
    process.env.DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'theta';
    const csv = 'expiration\n2100-01-01\n';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(csv, { status: 200, statusText: 'OK' })
    );
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(expirations).toContain('2100-01-01');
  });

  it('throws ThetaDataError in live mode when fetch fails', async () => {
    process.env.DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'theta';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const module = await import('../market-data');
    await expect(module.getExpirations('SPY')).rejects.toBeInstanceOf(module.MarketDataError);
  });

  it('falls back to mock expirations in auto mode on HTTP error', async () => {
    process.env.DATA_MODE = 'auto';
    process.env.MARKET_DATA_PROVIDER = 'theta';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 500, statusText: 'ERR' })
    );
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(expirations.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('parses Massive expirations JSON payload', async () => {
    process.env.DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'massive';
    process.env.MASSIVE_API_KEY = 'test-key';
    mockMassiveClient.listOptionsContracts.mockResolvedValue({
      results: [{ expiration_date: '2030-01-01' }, { expiration_date: '2031-02-14' }],
    });
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(expirations).toEqual(['2030-01-01', '2031-02-14']);
  });

  it('parses Massive option chain JSON payload', async () => {
    process.env.DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'massive';
    process.env.MASSIVE_API_KEY = 'test-key';
    const responseBody = {
      results: [
        {
          details: {
            contract_type: 'call',
            expiration_date: '2030-01-01',
            shares_per_contract: 100,
            strike_price: 400,
            ticker: 'SPY230101C00400000',
          },
          last_quote: {
            bid: 1.2,
            ask: 1.4,
            midpoint: 1.3,
          },
          day: {
            change: 0,
            change_percent: 0,
            close: 1.3,
            high: 0,
            low: 0,
            open: 0,
            previous_close: 0,
            volume: 10,
            vwap: 0,
          },
          open_interest: 20,
          greeks: { delta: 0.5, gamma: 0, theta: 0, vega: 0, rho: 0 },
          implied_volatility: 0.2,
        },
        {
          details: {
            contract_type: 'put',
            expiration_date: '2030-01-01',
            shares_per_contract: 100,
            strike_price: 400,
            ticker: 'SPY230101P00400000',
          },
          last_quote: {
            bid: 1.1,
            ask: 1.3,
            midpoint: 1.2,
          },
          day: {
            change: 0,
            change_percent: 0,
            close: 1.2,
            high: 0,
            low: 0,
            open: 0,
            previous_close: 0,
            volume: 12,
            vwap: 0,
          },
          open_interest: 22,
          greeks: { delta: -0.5, gamma: 0, theta: 0, vega: 0, rho: 0 },
          implied_volatility: 0.25,
        },
      ],
    };
    mockMassiveClient.getOptionsChain.mockResolvedValue(responseBody);
    const module = await import('../market-data');
    const chain = await module.getOptionChain('SPY', '2030-01-01');
    expect(chain.calls[0]?.strike).toBe(400);
    expect(chain.puts[0]?.right).toBe('put');
  });
});

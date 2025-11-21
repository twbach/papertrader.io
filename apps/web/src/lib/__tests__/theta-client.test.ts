import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMarketDataProvider } from '../market-data/provider-factory';

const originalMode = process.env.THETA_DATA_MODE;
const originalProvider = process.env.MARKET_DATA_PROVIDER;
const originalMassiveKey = process.env.MASSIVE_API_KEY;

beforeEach(() => {
  process.env.MARKET_DATA_PROVIDER = originalProvider;
  process.env.MASSIVE_API_KEY = originalMassiveKey;
});

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.THETA_DATA_MODE;
  } else {
    process.env.THETA_DATA_MODE = originalMode;
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
  vi.restoreAllMocks();
  vi.resetModules();
  setMarketDataProvider(null);
});

describe('market-data service', () => {
  it('bypasses fetch when mode is mock', async () => {
    process.env.THETA_DATA_MODE = 'mock';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(expirations.length).toBeGreaterThan(0);
  });

  it('returns live expirations when Theta responds', async () => {
    process.env.THETA_DATA_MODE = 'live';
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
    process.env.THETA_DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'theta';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const module = await import('../market-data');
    await expect(module.getExpirations('SPY')).rejects.toBeInstanceOf(module.MarketDataError);
  });

  it('falls back to mock expirations in auto mode on HTTP error', async () => {
    process.env.THETA_DATA_MODE = 'auto';
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
    process.env.THETA_DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'massive';
    process.env.MASSIVE_API_KEY = 'test-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ expiration: '2030-01-01' }, '2031-02-14'] }), {
        status: 200,
        statusText: 'OK',
      })
    );
    const module = await import('../market-data');
    const expirations = await module.getExpirations('SPY');
    expect(expirations).toEqual(['2030-01-01', '2031-02-14']);
  });

  it('parses Massive option chain JSON payload', async () => {
    process.env.THETA_DATA_MODE = 'live';
    process.env.MARKET_DATA_PROVIDER = 'massive';
    process.env.MASSIVE_API_KEY = 'test-key';
    const responseBody = {
      results: [
        {
          symbol: 'SPY',
          strike: 400,
          expiration: '2030-01-01',
          type: 'call',
          bid: 1.2,
          ask: 1.4,
          last: 1.3,
          volume: 10,
          open_interest: 20,
          greeks: { delta: 0.5 },
        },
        {
          symbol: 'SPY',
          strike: 400,
          expiration: '2030-01-01',
          type: 'put',
          bid: 1.1,
          ask: 1.3,
          last: 1.2,
          volume: 12,
          open_interest: 22,
          greeks: { delta: -0.5 },
        },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), { status: 200, statusText: 'OK' })
    );
    const module = await import('../market-data');
    const chain = await module.getOptionChain('SPY', '2030-01-01');
    expect(chain.calls[0]?.strike).toBe(400);
    expect(chain.puts[0]?.right).toBe('put');
  });
});

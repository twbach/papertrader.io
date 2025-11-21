import { afterEach, describe, expect, it, vi } from 'vitest';

const originalMode = process.env.THETA_DATA_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.THETA_DATA_MODE;
  } else {
    process.env.THETA_DATA_MODE = originalMode;
  }
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('theta-client', () => {
  it('bypasses fetch when mode is mock', async () => {
    process.env.THETA_DATA_MODE = 'mock';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const module = await import('../theta-client');
    const expirations = await module.getExpirations('SPY');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(expirations.length).toBeGreaterThan(0);
  });

  it('returns live expirations when Theta responds', async () => {
    process.env.THETA_DATA_MODE = 'live';
    const csv = 'expiration\n2100-01-01\n';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(csv, { status: 200, statusText: 'OK' })
    );
    const module = await import('../theta-client');
    const expirations = await module.getExpirations('SPY');
    expect(expirations).toContain('2100-01-01');
  });

  it('throws ThetaDataError in live mode when fetch fails', async () => {
    process.env.THETA_DATA_MODE = 'live';
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const module = await import('../theta-client');
    await expect(module.getExpirations('SPY')).rejects.toBeInstanceOf(module.ThetaDataError);
  });

  it('falls back to mock expirations in auto mode on HTTP error', async () => {
    process.env.THETA_DATA_MODE = 'auto';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 500, statusText: 'ERR' })
    );
    const module = await import('../theta-client');
    const expirations = await module.getExpirations('SPY');
    expect(expirations.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
  });
});

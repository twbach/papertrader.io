import { afterEach, describe, expect, it, vi } from 'vitest';

const originalMode = process.env.DATA_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.DATA_MODE;
  } else {
    process.env.DATA_MODE = originalMode;
  }
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('theta-config', () => {
  it('returns auto mode by default', async () => {
    delete process.env.DATA_MODE;
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const module = await import('../market-data-config');
    expect(module.getMarketDataMode()).toBe('auto');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('reads explicit mock mode', async () => {
    process.env.DATA_MODE = 'mock';
    const module = await import('../market-data-config');
    expect(module.getMarketDataMode()).toBe('mock');
    expect(module.isMockMode()).toBe(true);
  });

  it('throws on invalid mode', async () => {
    process.env.DATA_MODE = 'invalid';
    await expect(import('../market-data-config')).rejects.toThrow('Invalid DATA_MODE');
  });
});

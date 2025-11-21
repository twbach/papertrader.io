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

describe('theta-config', () => {
  it('returns auto mode by default', async () => {
    delete process.env.THETA_DATA_MODE;
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const module = await import('../theta-config');
    expect(module.getThetaDataMode()).toBe('auto');
    expect(infoSpy).toHaveBeenCalled();
  });

  it('reads explicit mock mode', async () => {
    process.env.THETA_DATA_MODE = 'mock';
    const module = await import('../theta-config');
    expect(module.getThetaDataMode()).toBe('mock');
    expect(module.isMockMode()).toBe(true);
  });

  it('throws on invalid mode', async () => {
    process.env.THETA_DATA_MODE = 'invalid';
    await expect(import('../theta-config')).rejects.toThrow('Invalid THETA_DATA_MODE');
  });
});

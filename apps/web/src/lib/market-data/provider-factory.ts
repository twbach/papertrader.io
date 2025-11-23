import type { MarketDataProvider, MarketDataProviderId } from './provider';
import { createThetaProvider } from './theta-provider';
import { createMassiveProvider } from './massive-provider';

const VALID_PROVIDER_IDS: MarketDataProviderId[] = ['massive', 'theta'];

let cachedProvider: MarketDataProvider | null = null;
let cachedProviderId: MarketDataProviderId | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  const desiredProvider = resolveProviderId();
  if (!cachedProvider || cachedProviderId !== desiredProvider) {
    cachedProvider = instantiateProvider(desiredProvider);
    cachedProviderId = desiredProvider;
  }
  return cachedProvider;
}

export function setMarketDataProvider(provider: MarketDataProvider | null): void {
  cachedProvider = provider;
  cachedProviderId = provider?.id ?? null;
}

export function getConfiguredMarketDataProviderId(): MarketDataProviderId {
  return resolveProviderId();
}

function resolveProviderId(): MarketDataProviderId {
  const rawValue = process.env.MARKET_DATA_PROVIDER;
  if (!rawValue || rawValue.trim().length === 0) {
    return 'massive';
  }
  const normalized = rawValue.trim().toLowerCase();
  if (VALID_PROVIDER_IDS.includes(normalized as MarketDataProviderId)) {
    return normalized as MarketDataProviderId;
  }
  const validValues = VALID_PROVIDER_IDS.join(', ');
  throw new Error(
    `[MarketData] Invalid MARKET_DATA_PROVIDER "${rawValue}". Valid options: ${validValues}.`,
  );
}

function instantiateProvider(id: MarketDataProviderId): MarketDataProvider {
  if (id === 'theta') {
    return createThetaProvider();
  }
  return createMassiveProvider();
}


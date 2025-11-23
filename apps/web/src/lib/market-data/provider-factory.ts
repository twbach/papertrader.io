import type { MarketDataProvider, MarketDataProviderId } from './provider';
import { createThetaProvider } from './theta-provider';
import { createMassiveProvider } from './massive-provider';
import { createEodhdProvider } from './eodhd-provider';
import { createStrategyProvider } from './strategy-provider';

const VALID_OPTIONS_PROVIDERS: MarketDataProviderId[] = ['massive', 'theta'];
const VALID_STOCK_PROVIDERS: MarketDataProviderId[] = ['eodhd'];

let cachedProvider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const optionsProviderId = resolveOptionsProviderId();
  const stockProviderId = resolveStockProviderId();

  const optionsProvider = instantiateOptionsProvider(optionsProviderId);
  const stockProvider = instantiateStockProvider(stockProviderId);

  cachedProvider = createStrategyProvider({
    optionsProvider,
    stockProvider,
  });

  return cachedProvider;
}

export function setMarketDataProvider(provider: MarketDataProvider | null): void {
  cachedProvider = provider;
}

export function getConfiguredMarketDataProviderId(): MarketDataProviderId {
  return 'strategy';
}

function resolveOptionsProviderId(): MarketDataProviderId {
  const rawValue = process.env.MARKET_DATA_PROVIDER;
  if (!rawValue || rawValue.trim().length === 0) {
    return 'massive';
  }
  const normalized = rawValue.trim().toLowerCase();
  if (VALID_OPTIONS_PROVIDERS.includes(normalized as MarketDataProviderId)) {
    return normalized as MarketDataProviderId;
  }
  const validValues = VALID_OPTIONS_PROVIDERS.join(', ');
  throw new Error(
    `[MarketData] Invalid MARKET_DATA_PROVIDER "${rawValue}". Valid options: ${validValues}.`,
  );
}

function resolveStockProviderId(): MarketDataProviderId {
  const rawValue = process.env.STOCK_DATA_PROVIDER;
  if (!rawValue || rawValue.trim().length === 0) {
    return 'eodhd';
  }
  const normalized = rawValue.trim().toLowerCase();
  if (VALID_STOCK_PROVIDERS.includes(normalized as MarketDataProviderId)) {
    return normalized as MarketDataProviderId;
  }
  const validValues = VALID_STOCK_PROVIDERS.join(', ');
  throw new Error(
    `[MarketData] Invalid STOCK_DATA_PROVIDER "${rawValue}". Valid options: ${validValues}.`,
  );
}

function instantiateOptionsProvider(id: MarketDataProviderId): MarketDataProvider {
  if (id === 'theta') {
    return createThetaProvider();
  }
  return createMassiveProvider();
}

function instantiateStockProvider(id: MarketDataProviderId): MarketDataProvider {
  if (id === 'eodhd') {
    return createEodhdProvider();
  }
  throw new Error(`Unsupported stock provider: ${id}`);
}


const VALID_MODES = ['auto', 'live', 'mock'] as const;

export type MarketDataMode = (typeof VALID_MODES)[number];

let cachedMode: MarketDataMode = resolveMode(process.env.DATA_MODE);
let hasLoggedMode = false;

logModeDetection(cachedMode, process.env.DATA_MODE);

export function getMarketDataMode(): MarketDataMode {
  return cachedMode;
}

export function isMockMode(): boolean {
  return getMarketDataMode() === 'mock';
}

export function isLiveMode(): boolean {
  return getMarketDataMode() === 'live';
}

export function isAutoMode(): boolean {
  return getMarketDataMode() === 'auto';
}

function resolveMode(rawValue: string | undefined): MarketDataMode {
  if (!rawValue || rawValue.trim().length === 0) {
    return 'auto';
  }
  const normalizedValue = rawValue.trim().toLowerCase();
  if (isValidMode(normalizedValue)) {
    return normalizedValue;
  }
  const validValues = VALID_MODES.join(', ');
  throw new Error(
    `[ThetaData] Invalid DATA_MODE "${rawValue}". Valid options: ${validValues}.`,
  );
}

function isValidMode(value: string): value is MarketDataMode {
  return (VALID_MODES as readonly string[]).includes(value);
}

function logModeDetection(mode: MarketDataMode, rawValue: string | undefined): void {
  if (hasLoggedMode) {
    return;
  }
  hasLoggedMode = true;
  const payload = {
    event: 'market-data-mode-detected',
    mode,
    rawValue: rawValue ?? 'auto (default)',
    source: resolveLogSource(),
  };
  console.info(JSON.stringify(payload));
}

function resolveLogSource(): string {
  const provider = process.env.MARKET_DATA_PROVIDER?.trim().toLowerCase();
  return provider ? `market-data:${provider}` : 'market-data';
}

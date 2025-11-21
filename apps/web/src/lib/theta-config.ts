const VALID_MODES = ['auto', 'live', 'mock'] as const;

export type ThetaDataMode = (typeof VALID_MODES)[number];

let cachedMode: ThetaDataMode = resolveMode(process.env.THETA_DATA_MODE);
let hasLoggedMode = false;

logModeDetection(cachedMode, process.env.THETA_DATA_MODE);

export function getThetaDataMode(): ThetaDataMode {
  return cachedMode;
}

export function isMockMode(): boolean {
  return getThetaDataMode() === 'mock';
}

export function isLiveMode(): boolean {
  return getThetaDataMode() === 'live';
}

export function isAutoMode(): boolean {
  return getThetaDataMode() === 'auto';
}

function resolveMode(rawValue: string | undefined): ThetaDataMode {
  if (!rawValue || rawValue.trim().length === 0) {
    return 'auto';
  }
  const normalizedValue = rawValue.trim().toLowerCase();
  if (isValidMode(normalizedValue)) {
    return normalizedValue;
  }
  const validValues = VALID_MODES.join(', ');
  throw new Error(
    `[ThetaData] Invalid THETA_DATA_MODE "${rawValue}". Valid options: ${validValues}.`,
  );
}

function isValidMode(value: string): value is ThetaDataMode {
  return (VALID_MODES as readonly string[]).includes(value);
}

function logModeDetection(mode: ThetaDataMode, rawValue: string | undefined): void {
  if (hasLoggedMode) {
    return;
  }
  hasLoggedMode = true;
  const payload = {
    event: 'theta-data-mode-detected',
    mode,
    rawValue: rawValue ?? 'auto (default)',
    source: 'theta-data',
  };
  console.info(JSON.stringify(payload));
}

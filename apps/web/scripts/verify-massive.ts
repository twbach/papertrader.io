import { createMassiveProvider } from '../src/lib/market-data/massive-provider';
import { MarketDataProviderError } from '../src/lib/market-data/errors';

interface VerificationArgs {
  readonly symbol: string;
  readonly expiration?: string;
}

async function main(): Promise<void> {
  const args = parseArgs();
  ensureApiKey();

  const provider = createMassiveProvider();
  const start = Date.now();

  try {
    const expirations = await provider.getExpirations(args.symbol);
    if (expirations.length === 0) {
      throw new Error('Massive API returned zero expirations.');
    }
    logSuccess(`Expirations (${expirations.length}) for ${args.symbol}`, expirations.slice(0, 5));

    const expiration = args.expiration ?? expirations[0]!;
    const chain = await provider.getOptionChain(args.symbol, expiration);
    logSuccess(`Option chain for ${args.symbol} ${expiration}`, [
      `calls=${chain.calls.length}`,
      `puts=${chain.puts.length}`,
    ]);

    const quote = await provider.getUnderlyingQuote(args.symbol);
    logSuccess(`Underlying quote for ${args.symbol} (via EODHD)`, [
      `last=${quote.last.toFixed(2)}`,
      `bid=${quote.bid.toFixed(2)}`,
      `ask=${quote.ask.toFixed(2)}`,
      `change=${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`,
    ]);

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Provider verification succeeded in ${duration}s.`);
    console.log(`   Option data: Massive REST API`);
    console.log(`   Stock quote: EODHD API`);
    process.exit(0);
  } catch (error) {
    reportFailure(error);
    process.exit(1);
  }
}

function parseArgs(): VerificationArgs {
  const [, , symbolArg, expirationArg] = process.argv;
  return {
    symbol: symbolArg?.toUpperCase() || 'SPY',
    expiration: expirationArg,
  };
}

function ensureApiKey(): void {
  if (!process.env.MASSIVE_API_KEY || process.env.MASSIVE_API_KEY.trim().length === 0) {
    console.error('❌ MASSIVE_API_KEY is not set. Please export it before running verification.');
    process.exit(1);
  }
  if (!process.env.EODHD_API_KEY || process.env.EODHD_API_KEY.trim().length === 0) {
    console.error('❌ EODHD_API_KEY is not set. Please export it before running verification.');
    console.error('   Get your API key at https://eodhd.com/register');
    process.exit(1);
  }
}

function logSuccess(message: string, details: Array<string>): void {
  console.log(`\n✔ ${message}`);
  details.forEach((detail) => console.log(`   - ${detail}`));
}

function reportFailure(error: unknown): void {
  if (error instanceof MarketDataProviderError) {
    console.error(`\n❌ Provider verification failed [${error.endpoint}]`);
    console.error(`   Provider: ${error.provider}`);
    console.error(`   Symbol: ${error.symbol}`);
    if (error.expiration) {
      console.error(`   Expiration: ${error.expiration}`);
    }
    console.error(`   Type: ${error.errorType}`);
    console.error(`   Message: ${error.message}`);
    if (error.metadata) {
      console.error(`   Metadata: ${JSON.stringify(error.metadata)}`);
    }
    return;
  }
  console.error('\n❌ Provider verification failed with an unexpected error.');
  console.error(error);
}

main().catch((error) => {
  reportFailure(error);
  process.exit(1);
});


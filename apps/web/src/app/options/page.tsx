import { OptionsChain } from '@/components/options/OptionsChain';
import { getMarketDataMode } from '@/lib/market-data-config';
import { getConfiguredMarketDataProviderId } from '@/lib/market-data/provider-factory';

export default function OptionsPage() {
  const marketDataMode = getMarketDataMode();
  const marketDataProvider = getConfiguredMarketDataProviderId();
  const showMarketDataMeta = process.env.NODE_ENV !== 'production';

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-6 py-6">
        <OptionsChain
          symbol="SPY"
          marketDataMode={marketDataMode}
          marketDataProvider={marketDataProvider}
          showMarketDataMeta={showMarketDataMeta}
        />
      </div>
    </div>
  );
}

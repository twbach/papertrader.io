// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/Provider';
import { ExpirationSelector } from './ExpirationSelector';
import { OptionsTable } from './OptionsTable';
import { LegsPanel } from './LegsPanel';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { OptionLeg } from '@/types/option-leg';

interface OptionsChainProps {
  symbol: string;
}

export function OptionsChain({ symbol }: OptionsChainProps) {
  const [legs, setLegs] = useState<OptionLeg[]>([]);

  // Fetch underlying quote
  const { data: underlyingData, isLoading: quoteLoading } =
    trpc.options.getUnderlyingQuote.useQuery({
      symbol,
    });

  // Fetch expirations
  const { data: expirationsData, isLoading: expirationsLoading } =
    trpc.options.getExpirations.useQuery({
      symbol,
    });

  // Get first expiration as default
  const defaultExpiration = useMemo(() => {
    return expirationsData?.expirations?.[0] || '';
  }, [expirationsData?.expirations]);

  const [selectedExpiration, setSelectedExpiration] = useState<string>(defaultExpiration);

  // Update selected expiration when default changes
  useEffect(() => {
    if (defaultExpiration && !selectedExpiration) {
      setSelectedExpiration(defaultExpiration);
    }
  }, [defaultExpiration, selectedExpiration]);

  const handleAddLeg = (leg: OptionLeg) => {
    setLegs([...legs, leg]);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter((leg) => leg.id !== id));
  };

  // Fetch option chain for selected expiration
  const { data: chainData, isLoading: chainLoading } = trpc.options.getOptionChain.useQuery(
    {
      symbol,
      expiration: selectedExpiration,
    },
    {
      enabled: !!selectedExpiration,
    },
  );

  if (quoteLoading || expirationsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expirationsData?.expirations || !underlyingData) {
    return (
      <Card className="p-12 bg-card">
        <div className="text-center text-muted-foreground py-12">Unable to load data</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <Card className="p-6 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary">{symbol}</h1>
            {underlyingData && (
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-3xl font-bold text-card-foreground">
                  ${underlyingData.last.toFixed(2)}
                </span>
                <span
                  className={`text-lg font-bold ${
                    underlyingData.change >= 0 ? 'text-green-400' : 'text-destructive'
                  }`}
                >
                  {underlyingData.change >= 0 ? '+' : ''}
                  {underlyingData.change.toFixed(2)} ({underlyingData.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Expiration Selector */}
      <ExpirationSelector
        expirations={expirationsData.expirations}
        selectedExpiration={selectedExpiration}
        onExpirationChange={setSelectedExpiration}
      />

      {/* Options Table */}
      {chainLoading ? (
        <Card className="p-12 bg-card">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : chainData ? (
        <OptionsTable
          calls={chainData.calls}
          puts={chainData.puts}
          underlyingPrice={underlyingData.last}
          expiration={selectedExpiration}
          legs={legs}
          onAddLeg={handleAddLeg}
        />
      ) : (
        <Card className="p-12 bg-card">
          <div className="text-center text-muted-foreground py-12">
            No option chain data available
          </div>
        </Card>
      )}

      {/* Legs Panel - Fixed at bottom */}
      {legs.length > 0 && <LegsPanel legs={legs} onRemoveLeg={handleRemoveLeg} />}
    </div>
  );
}

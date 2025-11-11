'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/Provider';
import { ExpirationSelector } from './ExpirationSelector';
import { OptionsTable } from './OptionsTable';
import { Loader2 } from 'lucide-react';

interface OptionsChainProps {
  symbol: string;
}

export function OptionsChain({ symbol }: OptionsChainProps) {
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null);

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

  // Auto-select first expiration when data loads
  if (
    !selectedExpiration &&
    expirationsData?.expirations &&
    expirationsData.expirations.length > 0
  ) {
    setSelectedExpiration(expirationsData.expirations[0]);
  }

  // Fetch option chain for selected expiration
  const { data: chainData, isLoading: chainLoading } =
    trpc.options.getOptionChain.useQuery(
      {
        symbol,
        expiration: selectedExpiration!,
      },
      {
        enabled: !!selectedExpiration,
      }
    );

  if (quoteLoading || expirationsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{symbol}</h1>
          {underlyingData && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-semibold">${underlyingData.last.toFixed(2)}</span>
              <span
                className={`text-sm font-medium ${
                  underlyingData.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {underlyingData.change >= 0 ? '+' : ''}
                {underlyingData.change.toFixed(2)} ({underlyingData.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expiration Selector */}
      {expirationsData && (
        <ExpirationSelector
          expirations={expirationsData.expirations}
          selectedExpiration={selectedExpiration}
          onSelectExpiration={setSelectedExpiration}
        />
      )}

      {/* Options Table */}
      {chainLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : chainData && underlyingData ? (
        <OptionsTable
          calls={chainData.calls}
          puts={chainData.puts}
          underlyingPrice={underlyingData.last}
        />
      ) : (
        <div className="text-center text-muted-foreground py-12">
          Select an expiration to view options
        </div>
      )}
    </div>
  );
}

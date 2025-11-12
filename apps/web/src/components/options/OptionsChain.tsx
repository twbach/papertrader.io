'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/Provider';
import { ExpirationSelector } from './ExpirationSelector';
import { OptionsTable } from './OptionsTable';
import { Loader2 } from 'lucide-react';
import { Card } from 'pixel-retroui';

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
    <div className="space-y-6 w-full">
      {/* Header */}
      <Card bg="#1a1a1a" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-minecraft text-amber-400">{symbol}</h1>
            {underlyingData && (
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-3xl font-bold text-white">${underlyingData.last.toFixed(2)}</span>
                <span
                  className={`text-lg font-bold ${underlyingData.change >= 0 ? 'text-green-400' : 'text-red-400'
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
      {expirationsData && (
        <Card bg="#2d2d2d" className="p-4">
          <h2 className="text-lg font-bold text-amber-400 mb-3 font-minecraft">Expiration Dates</h2>
          <ExpirationSelector
            expirations={expirationsData.expirations}
            selectedExpiration={selectedExpiration}
            onSelectExpiration={setSelectedExpiration}
          />
        </Card>
      )}

      {/* Options Table */}
      {chainLoading ? (
        <Card bg="#2d2d2d" className="p-12">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-16 h-16 animate-spin text-amber-400" />
          </div>
        </Card>
      ) : chainData && underlyingData ? (
        <OptionsTable
          calls={chainData.calls}
          puts={chainData.puts}
          underlyingPrice={underlyingData.last}
        />
      ) : (
        <Card bg="#2d2d2d" className="p-12">
          <div className="text-center text-gray-400 py-12 font-minecraft">
            Select an expiration to view options
          </div>
        </Card>
      )}
    </div>
  );
}

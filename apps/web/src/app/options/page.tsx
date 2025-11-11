'use client';

import { OptionsChain } from '@/components/options/OptionsChain';

export default function OptionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-6 py-6">
        <OptionsChain symbol="SPY" />
      </div>
    </div>
  );
}

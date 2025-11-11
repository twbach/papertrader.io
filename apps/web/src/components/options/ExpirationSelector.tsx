'use client';

import { cn } from '@/lib/utils';

interface ExpirationSelectorProps {
  expirations: string[];
  selectedExpiration: string | null;
  onSelectExpiration: (expiration: string) => void;
}

export function ExpirationSelector({
  expirations,
  selectedExpiration,
  onSelectExpiration,
}: ExpirationSelectorProps) {
  const formatExpiration = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();

    return {
      label: `${month} ${day}`,
      days: diffDays,
    };
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {expirations.map((expiration) => {
        const { label, days } = formatExpiration(expiration);
        const isSelected = expiration === selectedExpiration;

        return (
          <button
            key={expiration}
            onClick={() => onSelectExpiration(expiration)}
            className={cn(
              'flex flex-col items-center px-4 py-2 rounded-lg border transition-colors whitespace-nowrap',
              isSelected
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            <span className="font-semibold">{label}</span>
            <span className="text-xs opacity-80">{days}d</span>
          </button>
        );
      })}
    </div>
  );
}

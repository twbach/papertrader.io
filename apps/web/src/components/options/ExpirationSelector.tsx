'use client';

import { Button } from 'pixel-retroui';

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
    <div className="flex gap-3 overflow-x-auto pb-2">
      {expirations.map((expiration) => {
        const { label, days } = formatExpiration(expiration);
        const isSelected = expiration === selectedExpiration;

        return (
          <Button
            key={expiration}
            onClick={() => onSelectExpiration(expiration)}
            bg={isSelected ? '#fbbf24' : '#4a5568'}
            textColor={isSelected ? '#1a1a1a' : '#f0f0f0'}
            shadow={isSelected ? '#d97706' : '#2d3748'}
            className="whitespace-nowrap"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">{label}</span>
              <span className="text-xs">{days}d</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

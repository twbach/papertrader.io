// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
'use client';

import { useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';

interface ExpirationSelectorProps {
  expirations: string[];
  selectedExpiration: string;
  onExpirationChange: (expiration: string) => void;
}

interface ExpirationWithDays {
  date: string;
  daysOut: number;
}

export function ExpirationSelector({
  expirations,
  selectedExpiration,
  onExpirationChange,
}: ExpirationSelectorProps) {
  const getDaysToExpiration = useCallback((date: string): number => {
    const today = new Date();
    const expirationDate = new Date(date);
    const diffTime = expirationDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, []);

  const expirationsWithDays = useMemo<ExpirationWithDays[]>(() => {
    return expirations.map((date) => ({
      date,
      daysOut: getDaysToExpiration(date),
    }));
  }, [expirations, getDaysToExpiration]);

  const groupExpirationsByMonth = useMemo(() => {
    const groups: { [key: string]: ExpirationWithDays[] } = {};
    expirationsWithDays.forEach((exp) => {
      const monthYear = new Date(exp.date).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(exp);
    });
    return groups;
  }, [expirationsWithDays]);

  const selectedDaysOut = useMemo(() => {
    const selected = expirationsWithDays.find((e) => e.date === selectedExpiration);
    return selected ? selected.daysOut : 0;
  }, [expirationsWithDays, selectedExpiration]);

  return (
    <Card className="p-0 w-full overflow-hidden bg-card border-2 border-border">
      <div className="bg-background px-4 py-3 border-b-2 border-border">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
            EXPIRATION: {selectedDaysOut}D
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {Object.entries(groupExpirationsByMonth).map(([monthYear, dates]) => (
              <div key={monthYear} className="flex flex-col gap-1">
                <div className="text-xs text-muted-foreground text-center px-2 mb-1 bg-muted font-bold">
                  {monthYear}
                </div>
                <div className="flex gap-1">
                  {dates.map((exp) => {
                    const day = new Date(exp.date).getDate();
                    const isSelected = selectedExpiration === exp.date;
                    return (
                      <button
                        key={exp.date}
                        onClick={() => onExpirationChange(exp.date)}
                        className={`px-3 py-2 text-sm rounded transition-all font-bold ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-card-foreground hover:bg-muted border border-border'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

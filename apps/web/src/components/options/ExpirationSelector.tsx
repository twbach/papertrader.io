// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
'use client';

import { useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <Card className="w-full overflow-hidden bg-card border-border">
      <div className="bg-background px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            EXPIRATION: {selectedDaysOut}D
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {Object.entries(groupExpirationsByMonth).map(([monthYear, dates]) => (
              <div key={monthYear} className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground text-center px-2 font-medium">
                  {monthYear}
                </div>
                <div className="flex gap-1">
                  {dates.map((exp) => {
                    const day = new Date(exp.date).getDate();
                    const isSelected = selectedExpiration === exp.date;
                    return (
                      <Button
                        key={exp.date}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onExpirationChange(exp.date)}
                        className="w-9 h-9 p-0"
                      >
                        {day}
                      </Button>
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

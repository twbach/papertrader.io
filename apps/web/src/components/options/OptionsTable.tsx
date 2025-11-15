'use client';

import { useMemo } from 'react';
import { Card } from '@/components/retroui/Card';
import { OptionQuote } from '@/lib/theta-client';

interface OptionsTableProps {
  calls: OptionQuote[];
  puts: OptionQuote[];
  underlyingPrice: number;
}

interface OptionsRow {
  strike: number;
  callVolume: number;
  callOI: number;
  callBid: number;
  callAsk: number;
  callLast: number;
  putLast: number;
  putBid: number;
  putAsk: number;
  putOI: number;
  putVolume: number;
  isATM: boolean;
}

type CallColumnKey = 'callVolume' | 'callOI' | 'callBid' | 'callAsk' | 'callLast';
type PutColumnKey = 'putLast' | 'putBid' | 'putAsk' | 'putOI' | 'putVolume';

interface ColumnConfig<T extends keyof OptionsRow> {
  key: T;
  label: string;
  align: 'left' | 'center' | 'right';
  formatter: (value: OptionsRow[T]) => string;
  emphasisClass?: string;
}

const callColumns: ColumnConfig<CallColumnKey>[] = [
  { key: 'callVolume', label: 'Vol', align: 'right', formatter: formatVolume },
  { key: 'callOI', label: 'OI', align: 'right', formatter: formatVolume },
  { key: 'callBid', label: 'Bid', align: 'right', formatter: formatPrice, emphasisClass: 'text-green-500' },
  { key: 'callAsk', label: 'Ask', align: 'right', formatter: formatPrice, emphasisClass: 'text-green-500' },
  { key: 'callLast', label: 'Last', align: 'right', formatter: formatPrice, emphasisClass: 'text-green-500 font-semibold' },
];

const putColumns: ColumnConfig<PutColumnKey>[] = [
  { key: 'putLast', label: 'Last', align: 'left', formatter: formatPrice, emphasisClass: 'text-destructive font-semibold' },
  { key: 'putBid', label: 'Bid', align: 'left', formatter: formatPrice, emphasisClass: 'text-destructive' },
  { key: 'putAsk', label: 'Ask', align: 'left', formatter: formatPrice, emphasisClass: 'text-destructive' },
  { key: 'putOI', label: 'OI', align: 'left', formatter: formatVolume },
  { key: 'putVolume', label: 'Vol', align: 'left', formatter: formatVolume },
];

export function OptionsTable({ calls, puts, underlyingPrice }: OptionsTableProps) {
  const atmStrike = useMemo(() => {
    const closest = calls.reduce((prev, curr) =>
      Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice) ? curr : prev
    );
    return closest?.strike || underlyingPrice;
  }, [calls, underlyingPrice]);

  const rowData = useMemo<OptionsRow[]>(() => {
    const strikes = [...new Set([...calls.map((c) => c.strike), ...puts.map((p) => p.strike)])].sort((a, b) => a - b);
    return strikes.map((strike) => {
      const call = calls.find((c) => c.strike === strike);
      const put = puts.find((p) => p.strike === strike);
      return {
        strike,
        callVolume: call?.volume || 0,
        callOI: call?.openInterest || 0,
        callBid: call?.bid || 0,
        callAsk: call?.ask || 0,
        callLast: call?.last || 0,
        putLast: put?.last || 0,
        putBid: put?.bid || 0,
        putAsk: put?.ask || 0,
        putOI: put?.openInterest || 0,
        putVolume: put?.volume || 0,
        isATM: strike === atmStrike,
      };
    });
  }, [calls, puts, atmStrike]);

  return (
    <Card className="w-full overflow-x-auto border-2 border-border bg-card">
      <div className="min-w-[1100px]">
        <div className="border-b-2 border-border bg-background px-4 py-3">
          <div className="grid grid-cols-[repeat(11,minmax(80px,1fr))] text-xs font-bold uppercase text-muted-foreground">
            <div className="col-span-5 text-right pr-3">Calls</div>
            <div className="col-span-1 text-center">Strike</div>
            <div className="col-span-5 text-left pl-3">Puts</div>
          </div>
          <div className="mt-2 grid grid-cols-[repeat(11,minmax(80px,1fr))] text-[11px] font-bold uppercase text-muted-foreground">
            {callColumns.map((column) => (
              <div key={`call-header-${column.key}`} className="text-right px-3">{column.label}</div>
            ))}
            <div className="text-center px-3">Strike</div>
            {putColumns.map((column) => (
              <div key={`put-header-${column.key}`} className="text-left px-3">{column.label}</div>
            ))}
          </div>
        </div>
        <div>
          {rowData.map((row, index) => {
            const rowBg = row.isATM ? 'bg-accent' : index % 2 === 0 ? 'bg-card' : 'bg-background';
            return (
              <div
                key={row.strike}
                className={`grid grid-cols-[repeat(11,minmax(80px,1fr))] border-b border-border text-sm text-card-foreground transition-colors hover:bg-muted ${rowBg}`}
              >
                {callColumns.map((column) => (
                  <div
                    key={`call-${column.key}-${row.strike}`}
                    className={`px-3 py-2 text-right font-mono ${column.emphasisClass || ''}`}
                  >
                    {column.formatter(row[column.key])}
                  </div>
                ))}
                <div className={`px-3 py-2 text-center font-bold ${row.isATM ? 'bg-accent font-black text-foreground' : ''}`}>
                  {row.strike.toFixed(0)}
                </div>
                {putColumns.map((column) => (
                  <div
                    key={`put-${column.key}-${row.strike}`}
                    className={`px-3 py-2 text-left font-mono ${column.emphasisClass || ''}`}
                  >
                    {column.formatter(row[column.key])}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function formatPrice(value: number): string {
  if (value === 0) return '-';
  return value.toFixed(2);
}

function formatVolume(value: number): string {
  if (value === 0) return '-';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { OptionQuote } from '@/lib/market-data';
import { OptionLeg } from '@/types/option-leg';
import { AddLegDialog } from './AddLegDialog';

interface OptionsTableProps {
  calls: OptionQuote[];
  puts: OptionQuote[];
  underlyingPrice: number;
  expiration: string;
  legs?: OptionLeg[];
  onAddLeg?: (leg: OptionLeg) => void;
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
  {
    key: 'callBid',
    label: 'Bid',
    align: 'right',
    formatter: formatPrice,
    emphasisClass: 'text-green-500',
  },
  {
    key: 'callAsk',
    label: 'Ask',
    align: 'right',
    formatter: formatPrice,
    emphasisClass: 'text-green-500',
  },
  {
    key: 'callLast',
    label: 'Last',
    align: 'right',
    formatter: formatPrice,
    emphasisClass: 'text-green-500 font-semibold',
  },
];

const putColumns: ColumnConfig<PutColumnKey>[] = [
  {
    key: 'putLast',
    label: 'Last',
    align: 'left',
    formatter: formatPrice,
    emphasisClass: 'text-destructive font-semibold',
  },
  {
    key: 'putBid',
    label: 'Bid',
    align: 'left',
    formatter: formatPrice,
    emphasisClass: 'text-destructive',
  },
  {
    key: 'putAsk',
    label: 'Ask',
    align: 'left',
    formatter: formatPrice,
    emphasisClass: 'text-destructive',
  },
  { key: 'putOI', label: 'OI', align: 'left', formatter: formatVolume },
  { key: 'putVolume', label: 'Vol', align: 'left', formatter: formatVolume },
];

export function OptionsTable({
  calls,
  puts,
  underlyingPrice,
  expiration,
  legs = [],
  onAddLeg,
}: OptionsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{
    type: 'call' | 'put';
    priceType: 'bid' | 'ask' | 'last';
    price: number;
    strike: number;
  } | null>(null);

  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const atmRowRef = useRef<HTMLDivElement>(null);

  const atmStrike = useMemo(() => {
    if (!calls || calls.length === 0) return underlyingPrice;
    const closest = calls.reduce((prev, curr) =>
      Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice)
        ? curr
        : prev,
    );
    return closest?.strike || underlyingPrice;
  }, [calls, underlyingPrice]);

  // Scroll to ATM on mount and when expiration changes
  useEffect(() => {
    if (atmRowRef.current && containerRef.current) {
      const container = containerRef.current;
      const row = atmRowRef.current;

      // Calculate center position
      const rowTop = row.offsetTop;
      const rowHeight = row.offsetHeight;
      const containerHeight = container.clientHeight;

      container.scrollTop = rowTop - containerHeight / 2 + rowHeight / 2;
    }
  }, [expiration, atmStrike]); // Re-run when expiration or ATM strike changes

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    startYRef.current = e.pageY - containerRef.current.offsetTop;
    scrollLeftRef.current = containerRef.current.scrollLeft;
    scrollTopRef.current = containerRef.current.scrollTop;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startXRef.current) * 1.5; // Scroll speed multiplier
    const walkY = (y - startYRef.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeftRef.current - walkX;
    containerRef.current.scrollTop = scrollTopRef.current - walkY;
  };

  const handlePriceClick = (
    type: 'call' | 'put',
    priceType: 'bid' | 'ask' | 'last',
    price: number,
    strike: number,
  ) => {
    if (!onAddLeg || isDragging) return; // Prevent click when dragging
    setSelectedOption({ type, priceType, price, strike });
    setDialogOpen(true);
  };

  const handleAddLeg = (leg: OptionLeg) => {
    if (onAddLeg) {
      onAddLeg(leg);
    }
    setDialogOpen(false);
  };

  const rowData = useMemo<OptionsRow[]>(() => {
    const strikes = [
      ...new Set([...calls.map((c) => c.strike), ...puts.map((p) => p.strike)]),
    ].sort((a, b) => a - b);
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
    <Card className="w-full border-2 border-border bg-card overflow-hidden">
      <div
        ref={containerRef}
        className={`h-[600px] overflow-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="min-w-[1100px]">
          <div className="sticky top-0 z-10 border-b-2 border-border bg-card px-4 py-3 shadow-sm">
            <div className="grid grid-cols-[repeat(11,minmax(80px,1fr))] text-xs font-bold uppercase text-muted-foreground">
              <div className="col-span-5 text-right pr-3">Calls</div>
              <div className="col-span-1 text-center">Strike</div>
              <div className="col-span-5 text-left pl-3">Puts</div>
            </div>
            <div className="mt-2 grid grid-cols-[repeat(11,minmax(80px,1fr))] text-[11px] font-bold uppercase text-muted-foreground">
              {callColumns.map((column) => (
                <div key={`call-header-${column.key}`} className="text-right px-3">
                  {column.label}
                </div>
              ))}
              <div className="text-center px-3">Strike</div>
              {putColumns.map((column) => (
                <div key={`put-header-${column.key}`} className="text-left px-3">
                  {column.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            {rowData.map((row, index) => {
              // Check if this strike has any legs in the strategy
              const callLeg = legs.find(
                (leg) =>
                  leg.strike === row.strike && leg.type === 'call' && leg.expiration === expiration,
              );
              const putLeg = legs.find(
                (leg) =>
                  leg.strike === row.strike && leg.type === 'put' && leg.expiration === expiration,
              );
              const hasCallLeg = !!callLeg;
              const hasPutLeg = !!putLeg;

              const rowBg = row.isATM ? 'bg-accent' : index % 2 === 0 ? 'bg-card' : 'bg-background';
              return (
                <div
                  key={row.strike}
                  ref={row.isATM ? atmRowRef : null}
                  className={`grid grid-cols-[repeat(11,minmax(80px,1fr))] border-b border-border text-sm text-card-foreground transition-colors hover:bg-muted ${rowBg}`}
                >
                  {/* Call columns */}
                  <div
                    className={`col-span-5 grid grid-cols-5 gap-0 ${hasCallLeg
                      ? callLeg.action === 'buy'
                        ? 'border-l-4 border-l-green-500 bg-green-500/10'
                        : 'border-l-4 border-l-red-500 bg-red-500/10'
                      : ''
                      }`}
                  >
                    {callColumns.map((column) => {
                      const isPriceColumn =
                        column.key === 'callBid' ||
                        column.key === 'callAsk' ||
                        column.key === 'callLast';
                      const price =
                        column.key === 'callBid'
                          ? row.callBid
                          : column.key === 'callAsk'
                            ? row.callAsk
                            : row.callLast;
                      const priceType =
                        column.key === 'callBid' ? 'bid' : column.key === 'callAsk' ? 'ask' : 'last';
                      return (
                        <div
                          key={`call-${column.key}-${row.strike}`}
                          className={`px-3 py-2 text-right font-mono ${column.emphasisClass || ''} ${isPriceColumn && onAddLeg && price > 0
                            ? 'cursor-pointer hover:underline'
                            : ''
                            } ${hasCallLeg ? 'font-semibold' : ''}`}
                          onClick={() => {
                            // Prevent click if we were dragging
                            if (isDragging) return;
                            if (isPriceColumn && onAddLeg && price > 0) {
                              handlePriceClick('call', priceType, price, row.strike);
                            }
                          }}
                        >
                          {column.formatter(row[column.key])}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className={`px-3 py-2 text-center font-bold ${row.isATM ? 'bg-accent font-black text-foreground' : ''}`}
                  >
                    {row.strike.toFixed(0)}
                  </div>
                  {/* Put columns */}
                  <div
                    className={`col-span-5 grid grid-cols-5 gap-0 ${hasPutLeg
                      ? putLeg.action === 'buy'
                        ? 'border-l-4 border-l-green-500 bg-green-500/10'
                        : 'border-l-4 border-l-red-500 bg-red-500/10'
                      : ''
                      }`}
                  >
                    {putColumns.map((column) => {
                      const isPriceColumn =
                        column.key === 'putLast' ||
                        column.key === 'putBid' ||
                        column.key === 'putAsk';
                      const price =
                        column.key === 'putLast'
                          ? row.putLast
                          : column.key === 'putBid'
                            ? row.putBid
                            : row.putAsk;
                      const priceType =
                        column.key === 'putLast' ? 'last' : column.key === 'putBid' ? 'bid' : 'ask';
                      return (
                        <div
                          key={`put-${column.key}-${row.strike}`}
                          className={`px-3 py-2 text-left font-mono ${column.emphasisClass || ''} ${isPriceColumn && onAddLeg && price > 0
                            ? 'cursor-pointer hover:underline'
                            : ''
                            } ${hasPutLeg ? 'font-semibold' : ''}`}
                          onClick={() => {
                            // Prevent click if we were dragging
                            if (isDragging) return;
                            if (isPriceColumn && onAddLeg && price > 0) {
                              handlePriceClick('put', priceType, price, row.strike);
                            }
                          }}
                        >
                          {column.formatter(row[column.key])}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedOption && (
            <AddLegDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              optionType={selectedOption.type}
              strike={selectedOption.strike}
              expiration={expiration}
              priceType={selectedOption.priceType}
              price={selectedOption.price}
              onAddLeg={handleAddLeg}
            />
          )}
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

'use client';

import { useMemo, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/Provider';
import { OptionsTable } from './OptionsTable';
import { Card } from '@/components/retroui/Card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpirationRowTableProps {
    symbol: string;
    expirations: string[];
    underlyingPrice: number;
}

export function ExpirationRowTable({ symbol, expirations, underlyingPrice }: ExpirationRowTableProps) {
    const [expandedExpirations, setExpandedExpirations] = useState<Set<string>>(new Set());

    const formatExpiration = useCallback((dateStr: string) => {
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
    }, []);

    const expirationRows = useMemo(() => {
        return expirations.map((expiration) => {
            const { label, days } = formatExpiration(expiration);
            return {
                expiration,
                label,
                days,
            };
        });
    }, [expirations, formatExpiration]);

    const toggleExpiration = useCallback((expiration: string) => {
        setExpandedExpirations((prev) => {
            const next = new Set(prev);
            if (next.has(expiration)) {
                next.delete(expiration);
            } else {
                next.add(expiration);
            }
            return next;
        });
    }, []);

    return (
        <Card className="p-0 w-full overflow-hidden bg-card">
            <div className="w-full">
                {/* Header */}
                <div className="bg-background px-4 py-2 border-b border-border">
                    <div className="text-lg font-bold text-primary">Expiration</div>
                </div>
                {/* Rows */}
                <div className="max-h-[600px] overflow-y-auto">
                    {expirationRows.map((row, index) => {
                        const isExpanded = expandedExpirations.has(row.expiration);
                        const isOdd = index % 2 === 1;
                        return (
                            <div key={row.expiration}>
                                <div
                                    onClick={() => toggleExpiration(row.expiration)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted transition-colors ${isOdd ? 'bg-card' : 'bg-background'
                                        }`}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                    <span className="font-bold text-primary">{row.label}</span>
                                    <span className="text-xs text-muted-foreground">{row.days}d</span>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-border bg-background">
                                        <ExpirationDetailCell
                                            expiration={row.expiration}
                                            symbol={symbol}
                                            underlyingPrice={underlyingPrice}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}

interface ExpirationDetailCellProps {
    expiration: string;
    symbol: string;
    underlyingPrice: number;
}

function ExpirationDetailCell({ expiration, symbol, underlyingPrice }: ExpirationDetailCellProps) {
    const { data: chainData, isLoading } = trpc.options.getOptionChain.useQuery(
        {
            symbol,
            expiration,
        },
        {
            enabled: true,
        }
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!chainData) {
        return (
            <div className="text-center text-muted-foreground py-8">
                No data available
            </div>
        );
    }

    return (
        <div className="w-full">
            <OptionsTable
                calls={chainData.calls}
                puts={chainData.puts}
                underlyingPrice={underlyingPrice}
                expiration={expiration}
            />
        </div>
    );
}


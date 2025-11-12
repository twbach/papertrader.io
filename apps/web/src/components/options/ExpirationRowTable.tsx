'use client';

import { useMemo, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/Provider';
import { OptionsTable } from './OptionsTable';
import { Card } from 'pixel-retroui';
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
        <Card bg="#3a3a3a" className="p-0 w-full overflow-hidden">
            <div className="w-full">
                {/* Header */}
                <div className="bg-[#1a1a1a] px-4 py-2 border-b border-gray-600">
                    <div className="text-lg font-bold text-amber-400 font-minecraft">Expiration</div>
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
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#3a3a3a] transition-colors ${isOdd ? 'bg-[#333333]' : 'bg-[#2d2d2d]'
                                        }`}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                                    )}
                                    <span className="font-bold text-amber-400 font-minecraft">{row.label}</span>
                                    <span className="text-xs text-gray-400">{row.days}d</span>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-gray-600 bg-[#1a1a1a]">
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
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!chainData) {
        return (
            <div className="text-center text-gray-400 py-8 font-minecraft">
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
            />
        </div>
    );
}


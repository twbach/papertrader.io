// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { OptionLeg } from '@/types/option-leg';

interface LegsPanelProps {
    legs: OptionLeg[];
    onRemoveLeg: (id: string) => void;
}

export function LegsPanel({ legs, onRemoveLeg }: LegsPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

    useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    // Only auto-collapse if user hasn't manually expanded
                    if (!isManuallyExpanded) {
                        // Collapse when scrolling down and past 100px
                        if (currentScrollY > 100 && currentScrollY > lastScrollY) {
                            setIsCollapsed(true);
                        }
                        // Expand when scrolling up or at top
                        else if (currentScrollY < lastScrollY || currentScrollY < 50) {
                            setIsCollapsed(false);
                        }
                    }

                    lastScrollY = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isManuallyExpanded]);

    const calculateTotalCost = () => {
        return legs.reduce((total, leg) => {
            const cost = leg.price * leg.quantity * 100;
            return total + (leg.action === 'buy' ? -cost : cost);
        }, 0);
    };

    const totalCost = calculateTotalCost();

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        setIsManuallyExpanded(!isCollapsed); // If expanding, mark as manually expanded

        // Reset manual expansion after 5 seconds
        if (!isCollapsed) {
            setTimeout(() => setIsManuallyExpanded(false), 5000);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out">
            <Card className={`bg-card border-2 border-border border-t-2 border-x-0 border-b-0 rounded-none transition-all duration-300 ${isCollapsed ? 'shadow-lg' : 'shadow-2xl'
                }`}>
                {/* Header - Always Visible */}
                <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors border-b-2 border-border"
                    onClick={toggleCollapse}
                >
                    <div className="flex items-center gap-4">
                        <h2 className="text-foreground font-bold">Strategy Legs ({legs.length})</h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                                Net {totalCost < 0 ? 'Debit' : 'Credit'}:
                            </span>
                            <span className={`font-bold ${totalCost < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ${Math.abs(totalCost).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <Button variant="outline" size="sm" className="hover:bg-muted" onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse();
                    }}>
                        {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Legs Details - Collapsible */}
                <div
                    className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0' : 'max-h-[400px]'
                        }`}
                >
                    <div className="p-4 space-y-3 overflow-y-auto max-h-[400px]">
                        {legs.map((leg) => (
                            <div
                                key={leg.id}
                                className="flex items-center justify-between p-4 bg-muted rounded border-2 border-border hover:bg-muted/70 transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1 flex-wrap">
                                    <Badge variant={leg.action === 'buy' ? 'default' : 'destructive'} className="uppercase min-w-[60px] justify-center">
                                        {leg.action}
                                    </Badge>
                                    <Badge variant={leg.type === 'call' ? 'outline' : 'secondary'} className="uppercase min-w-[50px] justify-center">
                                        {leg.type}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground">{leg.quantity}</span>
                                        <span className="text-muted-foreground">×</span>
                                        <span className="text-foreground">${leg.strike.toFixed(2)}</span>
                                        <span className="text-muted-foreground">@</span>
                                        <span className="text-foreground">${leg.price.toFixed(2)}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(leg.expiration).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {leg.orderType}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`text-sm font-bold ${leg.action === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                                        {leg.action === 'buy' ? '-' : '+'}${(leg.price * leg.quantity * 100).toFixed(2)}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveLeg(leg.id);
                                        }}
                                        className="hover:bg-muted"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}


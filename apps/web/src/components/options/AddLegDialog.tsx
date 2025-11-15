// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*' and adjust Dialog usage
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OptionLeg } from '@/types/option-leg';

interface AddLegDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    optionType: 'call' | 'put';
    strike: number;
    expiration: string;
    priceType: 'bid' | 'ask' | 'last';
    price: number;
    onAddLeg: (leg: OptionLeg) => void;
}

export function AddLegDialog({
    open,
    onOpenChange,
    optionType,
    strike,
    expiration,
    priceType,
    price,
    onAddLeg,
}: AddLegDialogProps) {
    const [action, setAction] = useState<'buy' | 'sell'>('buy');
    const [quantity, setQuantity] = useState('1');
    const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
    const [limitPrice, setLimitPrice] = useState(price.toFixed(2));

    // Update limit price when price changes
    useEffect(() => {
        setLimitPrice(price.toFixed(2));
    }, [price]);

    const handleSubmit = () => {
        const leg: OptionLeg = {
            id: `${Date.now()}-${Math.random()}`,
            type: optionType,
            action,
            strike,
            expiration,
            quantity: parseInt(quantity) || 1,
            price: orderType === 'limit' ? parseFloat(limitPrice) || price : price,
            orderType,
        };
        onAddLeg(leg);
        onOpenChange(false);
    };

    const totalCost = (orderType === 'limit' ? parseFloat(limitPrice) || price : price) * (parseInt(quantity) || 0) * 100;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-2">
                <DialogHeader>
                    <DialogTitle className="text-foreground font-bold">Add Option Leg</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Add a new leg to your option strategy.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 px-4">
                    {/* Option Details */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded border-2 border-border">
                        <div>
                            <div className="text-sm text-muted-foreground">Type</div>
                            <div className="uppercase font-bold text-foreground">{optionType}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Strike</div>
                            <div className="font-bold text-foreground">${strike.toFixed(2)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Expiration</div>
                            <div className="text-foreground">
                                {new Date(expiration).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">{priceType.charAt(0).toUpperCase() + priceType.slice(1)} Price</div>
                            <div className="font-bold text-foreground">${price.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Action</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setAction('buy')}
                                className={`p-4 rounded border-2 transition-all ${action === 'buy'
                                    ? 'border-green-500 bg-green-500/20 text-green-400'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="font-semibold">Buy to Open</div>
                                    <div className="text-xs mt-1 opacity-80">Long Position</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAction('sell')}
                                className={`p-4 rounded border-2 transition-all ${action === 'sell'
                                    ? 'border-red-500 bg-red-500/20 text-red-400'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="font-semibold">Sell to Open</div>
                                    <div className="text-xs mt-1 opacity-80">Short Position</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-foreground">Quantity (Contracts)</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    {/* Order Type */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Order Type</Label>
                        <RadioGroup value={orderType} onValueChange={(value: string) => setOrderType(value as 'limit' | 'market')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="limit" id="limit" />
                                <Label htmlFor="limit" className="cursor-pointer text-foreground">Limit Order</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="market" id="market" />
                                <Label htmlFor="market" className="cursor-pointer text-foreground">Market Order</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Limit Price */}
                    {orderType === 'limit' && (
                        <div className="space-y-2">
                            <Label htmlFor="limitPrice" className="text-foreground">Limit Price</Label>
                            <Input
                                id="limitPrice"
                                type="number"
                                step="0.01"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(e.target.value)}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    )}

                    {/* Total Cost */}
                    <div className="p-4 bg-muted rounded border-2 border-border">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total {action === 'buy' ? 'Cost' : 'Credit'}:</span>
                            <span className="text-xl font-bold text-foreground">
                                ${Math.abs(totalCost).toFixed(2)}
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            ({quantity} contract{parseInt(quantity) !== 1 ? 's' : ''} × ${orderType === 'limit' ? limitPrice : price.toFixed(2)} × 100)
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-card border-border">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-primary">
                        Add Leg
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


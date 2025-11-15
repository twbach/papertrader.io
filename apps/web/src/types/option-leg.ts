export interface OptionLeg {
    id: string;
    type: 'call' | 'put';
    action: 'buy' | 'sell';
    strike: number;
    expiration: string;
    quantity: number;
    price: number;
    orderType: 'limit' | 'market';
}


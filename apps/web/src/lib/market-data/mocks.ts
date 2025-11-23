import type { OptionChainResult, OptionQuote, UnderlyingQuote } from './types';

const MAX_EXPIRATIONS = 20;

export function getMockExpirations(): string[] {
  const today = new Date();
  const expirations: string[] = [];
  for (let week = 1; week <= 8; week += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + week * 7);
    expirations.push(date.toISOString().split('T')[0]);
  }
  for (let month = 1; month <= 12; month += 1) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + month);
    date.setDate(15);
    expirations.push(date.toISOString().split('T')[0]);
  }
  return expirations.sort().slice(0, MAX_EXPIRATIONS);
}

export function getMockOptionChain(symbol: string, expiration: string): OptionChainResult {
  const underlyingPrice = MOCK_PRICES[symbol] ?? 450;
  const strikes = generateStrikes(underlyingPrice);
  const calls = strikes.map((strike) => buildMockOption(strike, expiration, 'call', underlyingPrice));
  const puts = strikes.map((strike) => buildMockOption(strike, expiration, 'put', underlyingPrice));
  return { calls, puts };
}

export function getMockUnderlyingQuote(symbol: string): UnderlyingQuote {
  const last = MOCK_PRICES[symbol] ?? 100;
  return {
    symbol,
    last,
    bid: last - 0.05,
    ask: last + 0.05,
    change: -2.5,
    changePercent: -0.55,
  };
}

const MOCK_PRICES: Record<string, number> = {
  SPY: 450.25,
  AAPL: 180.5,
  TSLA: 250.75,
  QQQ: 380,
};

function buildMockOption(
  strike: number,
  expiration: string,
  right: 'call' | 'put',
  underlyingPrice: number,
): OptionQuote {
  const inTheMoney = right === 'call' ? strike < underlyingPrice : strike > underlyingPrice;
  const distance = Math.abs(strike - underlyingPrice);
  const basePremium = inTheMoney ? distance + 5 : Math.max(0.05, 20 - distance / 2);
  const last = basePremium;
  const bid = Math.max(0.01, last - 0.15);
  const ask = last + 0.15;
  const deltaBase = inTheMoney ? 0.6 : 0.1;
  const deltaVariance = Math.random() * 0.3;
  const signedDelta = right === 'call' ? deltaBase + deltaVariance : -(deltaBase + deltaVariance);
  return {
    strike,
    expiration,
    right,
    bid,
    ask,
    last,
    volume: Math.floor(Math.random() * 1000) + 100,
    openInterest: Math.floor(Math.random() * 5000) + 500,
    delta: signedDelta,
    gamma: 0.01 + Math.random() * 0.05,
    theta: -(0.05 + Math.random() * 0.15),
    vega: 0.1 + Math.random() * 0.2,
    impliedVolatility: 0.15 + Math.random() * 0.15,
  };
}

function generateStrikes(center: number): number[] {
  const strikes: number[] = [];
  const increment = 5;
  const range = 10;
  for (let i = -range; i <= range; i += 1) {
    strikes.push(center + i * increment);
  }
  return strikes;
}


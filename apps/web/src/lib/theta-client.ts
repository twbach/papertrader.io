/**
 * ThetaData Terminal HTTP Client
 *
 * Connects to local Theta Terminal for options market data.
 * Falls back to mock data for development when Theta Terminal is unavailable.
 */

const THETA_BASE_URL = process.env.THETA_API_URL || 'http://0.0.0.0:25503/v3';

export interface OptionQuote {
  strike: number;
  expiration: string;
  right: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  impliedVolatility?: number;
}

export interface UnderlyingQuote {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
}

/**
 * Parse CSV response from Theta Terminal
 */
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const values = row.split(',').map((v) => v.replace(/"/g, '').trim());
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

/**
 * Fetch available expiration dates for a symbol
 */
export async function getExpirations(symbol: string): Promise<string[]> {
  try {
    const url = `${THETA_BASE_URL}/option/list/expirations?symbol=${symbol}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Theta API error: ${response.status}`);
    }

    const csv = await response.text();
    const data = parseCSV(csv);

    // Filter for future dates only and sort
    const today = new Date();
    const expirations = data
      .map((row) => row.expiration)
      .filter((date) => new Date(date) > today)
      .sort();

    return expirations.slice(0, 20); // Return first 20 future expirations
  } catch (error) {
    console.error('Failed to fetch expirations:', error);
    // Return mock expirations for development
    return getMockExpirations();
  }
}

/**
 * Fetch option chain for a specific symbol and expiration
 */
export async function getOptionChain(
  symbol: string,
  expiration: string
): Promise<{ calls: OptionQuote[]; puts: OptionQuote[] }> {
  try {
    // Format expiration date as YYYYMMDD
    const formattedDate = expiration.replace(/-/g, '');
    const url = `${THETA_BASE_URL}/option/snapshot/quote?symbol=${symbol}&expiration=${formattedDate}&format=csv`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      // Check if it's a subscription error
      if (text.includes('FREE subscription')) {
        console.warn('Free subscription - using mock data');
        return getMockOptionChain(symbol, expiration);
      }
      throw new Error(`Theta API error: ${response.status}`);
    }

    const csv = await response.text();
    const data = parseCSV(csv);

    const calls: OptionQuote[] = [];
    const puts: OptionQuote[] = [];

    data.forEach((row) => {
      const quote: OptionQuote = {
        strike: parseFloat(row.strike || '0'),
        expiration: row.expiration || expiration,
        right: (row.right?.toLowerCase() as 'call' | 'put') || 'call',
        bid: parseFloat(row.bid || '0'),
        ask: parseFloat(row.ask || '0'),
        last: parseFloat(row.last || '0'),
        volume: parseInt(row.volume || '0', 10),
        openInterest: parseInt(row.open_interest || '0', 10),
      };

      if (quote.right === 'call') {
        calls.push(quote);
      } else {
        puts.push(quote);
      }
    });

    return { calls, puts };
  } catch (error) {
    console.error('Failed to fetch option chain:', error);
    return getMockOptionChain(symbol, expiration);
  }
}

/**
 * Fetch current underlying quote
 */
export async function getUnderlyingQuote(symbol: string): Promise<UnderlyingQuote> {
  try {
    const url = `${THETA_BASE_URL}/stock/snapshot/quote?symbol=${symbol}&format=csv`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Theta API error: ${response.status}`);
    }

    const csv = await response.text();
    const data = parseCSV(csv);

    if (data.length === 0) {
      throw new Error('No data returned');
    }

    const row = data[0];
    return {
      symbol,
      last: parseFloat(row.last || '0'),
      bid: parseFloat(row.bid || '0'),
      ask: parseFloat(row.ask || '0'),
      change: parseFloat(row.change || '0'),
      changePercent: parseFloat(row.change_percent || '0'),
    };
  } catch (error) {
    console.error('Failed to fetch underlying quote:', error);
    return getMockUnderlyingQuote(symbol);
  }
}

// ============================================================================
// Mock Data Functions (for development)
// ============================================================================

function getMockExpirations(): string[] {
  const today = new Date();
  const expirations: string[] = [];

  // Generate weekly expirations for next 8 weeks
  for (let i = 1; i <= 8; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i * 7);
    expirations.push(date.toISOString().split('T')[0]);
  }

  // Add monthly expirations
  for (let i = 1; i <= 12; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + i);
    date.setDate(15); // Third Friday is usually around the 15th
    expirations.push(date.toISOString().split('T')[0]);
  }

  return expirations.sort().slice(0, 20);
}

function getMockOptionChain(
  symbol: string,
  expiration: string
): { calls: OptionQuote[]; puts: OptionQuote[] } {
  // Mock SPY at $450
  const underlyingPrice = 450;
  const strikes = generateStrikes(underlyingPrice);

  const calls: OptionQuote[] = strikes.map((strike) => {
    const itm = strike < underlyingPrice;
    const distance = Math.abs(strike - underlyingPrice);
    const premium = itm ? distance + 5 : Math.max(0.05, 20 - distance / 2);

    return {
      strike,
      expiration,
      right: 'call',
      bid: Math.max(0.01, premium - 0.15),
      ask: premium + 0.15,
      last: premium,
      volume: Math.floor(Math.random() * 1000) + 100,
      openInterest: Math.floor(Math.random() * 5000) + 500,
      delta: itm ? 0.6 + Math.random() * 0.3 : 0.1 + Math.random() * 0.4,
      gamma: 0.01 + Math.random() * 0.05,
      theta: -(0.05 + Math.random() * 0.15),
      vega: 0.1 + Math.random() * 0.2,
      impliedVolatility: 0.15 + Math.random() * 0.15,
    };
  });

  const puts: OptionQuote[] = strikes.map((strike) => {
    const itm = strike > underlyingPrice;
    const distance = Math.abs(strike - underlyingPrice);
    const premium = itm ? distance + 5 : Math.max(0.05, 20 - distance / 2);

    return {
      strike,
      expiration,
      right: 'put',
      bid: Math.max(0.01, premium - 0.15),
      ask: premium + 0.15,
      last: premium,
      volume: Math.floor(Math.random() * 1000) + 100,
      openInterest: Math.floor(Math.random() * 5000) + 500,
      delta: itm ? -(0.6 + Math.random() * 0.3) : -(0.1 + Math.random() * 0.4),
      gamma: 0.01 + Math.random() * 0.05,
      theta: -(0.05 + Math.random() * 0.15),
      vega: 0.1 + Math.random() * 0.2,
      impliedVolatility: 0.15 + Math.random() * 0.15,
    };
  });

  return { calls, puts };
}

function getMockUnderlyingQuote(symbol: string): UnderlyingQuote {
  // Mock prices for common symbols
  const prices: Record<string, number> = {
    SPY: 450.25,
    AAPL: 180.5,
    TSLA: 250.75,
    QQQ: 380.0,
  };

  const last = prices[symbol] || 100;
  return {
    symbol,
    last,
    bid: last - 0.05,
    ask: last + 0.05,
    change: -2.5,
    changePercent: -0.55,
  };
}

function generateStrikes(center: number): number[] {
  const strikes: number[] = [];
  const increment = 5;
  const range = 10; // 10 strikes on each side

  for (let i = -range; i <= range; i++) {
    strikes.push(center + i * increment);
  }

  return strikes;
}

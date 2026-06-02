'use server';

/**
 * @fileOverview Server actions for fetching real Forex market data via Finnhub.
 */

import { Candlestick } from '@/lib/forex-data-utils';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export async function fetchFinnhubCandles(
  symbol: string, 
  resolution: string, 
  apiKey: string
): Promise<Candlestick[] | null> {
  if (!apiKey) return null;

  try {
    // Fetch last 500 candles roughly
    const to = Math.floor(Date.now() / 1000);
    // Rough subtraction based on resolution
    let from;
    switch(resolution) {
      case '1': from = to - (60 * 500); break;
      case '5': from = to - (300 * 500); break;
      case '15': from = to - (900 * 500); break;
      case '30': from = to - (1800 * 500); break;
      case '60': from = to - (3600 * 500); break;
      case 'D': from = to - (86400 * 500); break;
      case 'W': from = to - (604800 * 500); break;
      default: from = to - (86400 * 500);
    }

    const url = `${FINNHUB_BASE_URL}/forex/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.s !== 'ok') {
      console.error('Finnhub Error:', data);
      return null;
    }

    // Finnhub returns arrays for t, o, h, l, c, v
    const formattedData: Candlestick[] = data.t.map((timestamp: number, i: number) => ({
      time: timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));

    return formattedData;
  } catch (error) {
    console.error('Failed to fetch Finnhub data:', error);
    return null;
  }
}

// Keeping fallback just in case
export async function fetchAlphaVantageData(pair: string, interval: string = '5min'): Promise<Candlestick[] | null> {
  return null; // Deprecated in favor of Finnhub
}

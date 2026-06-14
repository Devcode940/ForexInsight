
'use server';

/**
 * @fileOverview Server actions for fetching market data via Yahoo Finance.
 */

import yahooFinance from 'yahoo-finance2';
import { Candlestick } from '@/lib/forex-data-utils';

export async function fetchYahooCandles(
  symbol: string, 
  interval: string = '1h',
  range: string = '5d'
): Promise<Candlestick[] | null> {
  try {
    const queryOptions = {
      period1: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
      interval: interval as any,
    };

    const result = await yahooFinance.chart(symbol, queryOptions);

    if (!result || !result.quotes) {
      console.error('Yahoo Finance Error: No quotes returned for', symbol);
      return null;
    }

    const formattedData: Candlestick[] = result.quotes
      .filter(q => q.date && q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume || 0,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    return formattedData;
  } catch (error) {
    console.error('Failed to fetch Yahoo Finance data:', error);
    return null;
  }
}

/**
 * Legacy Finnhub fetcher kept for compatibility or fallback.
 */
export async function fetchFinnhubCandles(
  symbol: string, 
  resolution: string, 
  apiKey: string
): Promise<Candlestick[] | null> {
  // Redirect to Yahoo for consistency if requested
  return fetchYahooCandles(symbol, resolution);
}

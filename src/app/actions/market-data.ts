'use server';

/**
 * @fileOverview Server actions for fetching real Forex market data.
 */

import { Candlestick } from '@/lib/forex-data-utils';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export async function fetchAlphaVantageData(pair: string, interval: string = '5min'): Promise<Candlestick[] | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('ALPHA_VANTAGE_API_KEY not found in environment variables.');
    return null;
  }

  // Alpha Vantage requires symbols like EURUSD to be split or handled specifically for some endpoints
  // For FX_INTRADAY, from_symbol and to_symbol are required.
  const fromSymbol = pair.substring(0, 3);
  const toSymbol = pair.substring(3, 6);

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_INTRADAY&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&interval=${interval}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    const timeSeriesKey = `Time Series FX (${interval})`;
    const timeSeries = data[timeSeriesKey];

    if (!timeSeries) {
      console.error('Alpha Vantage Error or Limit reached:', data);
      return null;
    }

    const formattedData: Candlestick[] = Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => {
      return {
        time: new Date(timestamp).getTime() / 1000,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
      };
    }).sort((a, b) => (a.time as number) - (b.time as number));

    return formattedData;
  } catch (error) {
    console.error('Failed to fetch Alpha Vantage data:', error);
    return null;
  }
}

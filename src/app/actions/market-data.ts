
'use server';

import yahooFinance from 'yahoo-finance2';
import { Candlestick } from '@/lib/forex-data-utils';

export async function fetchYahooCandles(
  symbol: string, 
  interval: string = '1h'
): Promise<Candlestick[] | null> {
  try {
    const queryOptions = {
      period1: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
      interval: interval as any,
    };
    const result = await yahooFinance.chart(symbol, queryOptions);
    if (!result || !result.quotes) return null;

    return result.quotes
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
  } catch (error) {
    console.error('Yahoo Finance Error:', error);
    return null;
  }
}

export async function fetchFinnhubCandles(
  symbol: string, 
  resolution: string, 
  apiKey: string
): Promise<Candlestick[] | null> {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 7 * 24 * 60 * 60;
    const res = await fetch(
      `https://finnhub.io/api/v1/forex/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
    );
    const data = await res.json();
    if (data.s !== 'ok') return null;

    return data.t.map((t: number, i: number) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));
  } catch (error) {
    console.error('Finnhub Error:', error);
    return null;
  }
}

export async function fetchAlphaVantageCandles(
  fromSymbol: string,
  toSymbol: string,
  apiKey: string,
  interval: string = '60min'
): Promise<Candlestick[] | null> {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&interval=${interval}&apikey=${apiKey}`
    );
    const data = await res.json();
    const key = `Time Series FX (${interval})`;
    const series = data[key];
    if (!series) return null;

    return Object.keys(series).map(timestamp => {
      const item = series[timestamp];
      return {
        time: Math.floor(new Date(timestamp).getTime() / 1000),
        open: parseFloat(item['1. open']),
        high: parseFloat(item['2. high']),
        low: parseFloat(item['3. low']),
        close: parseFloat(item['4. close']),
      };
    }).sort((a, b) => (a.time as number) - (b.time as number));
  } catch (error) {
    console.error('Alpha Vantage Error:', error);
    return null;
  }
}

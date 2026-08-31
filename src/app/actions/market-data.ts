'use server';

import yahooFinance from 'yahoo-finance2';
import { z } from 'zod';
import { Candlestick } from '@/lib/forex-data-utils';
import { supabase } from '@/lib/supabase/config';
import { MARKET_DATA } from '@/lib/constants';

// --- Constants ---
const DEFAULT_LOOKBACK_DAYS = MARKET_DATA.LOOKBACK_DAYS;
const REQUEST_TIMEOUT_MS = MARKET_DATA.REQUEST_TIMEOUT_MS;
const MAX_CANDLES = MARKET_DATA.MAX_CANDLES_PER_FETCH;

// --- Input Validation Schemas ---
const SymbolSchema = z.string().min(3).max(12).regex(/^[A-Z0-9=X_F]+$/);
const YahooIntervalSchema = z.enum(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);
const FinnhubResolutionSchema = z.enum(['1', '5', '15', '30', '60', 'D', 'W', 'M']);
const AlphaVantageIntervalSchema = z.enum(['1min', '5min', '15min', '30min', '60min']);

// --- Helpers ---
async function fetchWithTimeout(url: string, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[MarketData:${context}] ${message}`, {
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

// --- Server Actions ---

export async function fetchYahooCandles(
  symbol: string,
  interval: string = '1h'
): Promise<Candlestick[] | null> {
  // Validate inputs
  const symbolResult = SymbolSchema.safeParse(symbol);
  if (!symbolResult.success) {
    logError('fetchYahooCandles', new Error(`Invalid symbol: ${symbol}`));
    return null;
  }

  try {
    const queryOptions = {
      period1: Math.floor(Date.now() / 1000) - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60,
      interval: interval as yahooFinance.ChartOptions["interval"],
    };

    const result = await yahooFinance.chart(symbol, queryOptions);

    if (!result || !result.quotes || result.quotes.length === 0) {
      return null;
    }

    const candles = result.quotes
      .filter(q =>
        q.date != null &&
        q.open != null &&
        q.high != null &&
        q.low != null &&
        q.close != null
      )
      .map((q) => ({
        time: Math.floor(new Date(q.date as Date).getTime() / 1000),
        open: q.open as number,
        high: q.high as number,
        low: q.low as number,
        close: q.close as number,
        volume: q.volume ?? 0,
      }))
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_CANDLES);

    return candles.length > 0 ? candles : null;
  } catch (error) {
    logError('fetchYahooCandles', error);
    return null;
  }
}

/**
 * Fetch candles from Finnhub.
 * NOTE: API key is retrieved server-side from the authenticated user's preferences
 * to avoid exposing it to the client.
 */
export async function fetchFinnhubCandles(
  symbol: string,
  resolution: string,
  userId?: string
): Promise<Candlestick[] | null> {
  const symbolResult = SymbolSchema.safeParse(symbol);
  const resolutionResult = FinnhubResolutionSchema.safeParse(resolution);
  if (!symbolResult.success || !resolutionResult.success) {
    logError('fetchFinnhubCandles', new Error('Invalid input parameters'));
    return null;
  }

  // Retrieve API key from server-side user preferences
  let apiKey: string | undefined;
  if (userId && supabase) {
    const { data } = await supabase
      .from('user_preferences')
      .select('finnhub_api_key')
      .eq('user_id', userId)
      .single();
    apiKey = data?.finnhub_api_key;
  }

  // Fall back to env var for unauthenticated or if not stored
  if (!apiKey) {
    apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  }

  if (!apiKey) {
    logError('fetchFinnhubCandles', new Error('No Finnhub API key available'));
    return null;
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60;

    const url = `https://finnhub.io/api/v1/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${to}&token=${apiKey}`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      logError('fetchFinnhubCandles', new Error(`HTTP ${res.status}`));
      return null;
    }

    const data = await res.json();

    if (data.s !== 'ok' || !Array.isArray(data.t) || data.t.length === 0) {
      return null;
    }

    return data.t.map((t: number, i: number) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v?.[i] ?? 0,
    })).slice(-MAX_CANDLES);
  } catch (error) {
    logError('fetchFinnhubCandles', error);
    return null;
  }
}

export async function fetchAlphaVantageCandles(
  fromSymbol: string,
  toSymbol: string,
  interval: string = '60min',
  userId?: string
): Promise<Candlestick[] | null> {
  const fromResult = SymbolSchema.safeParse(fromSymbol);
  const toResult = SymbolSchema.safeParse(toSymbol);
  if (!fromResult.success || !toResult.success) {
    logError('fetchAlphaVantageCandles', new Error('Invalid symbol parameters'));
    return null;
  }

  let apiKey: string | undefined;
  if (userId && supabase) {
    const { data } = await supabase
      .from('user_preferences')
      .select('alphavantage_api_key')
      .eq('user_id', userId)
      .single();
    apiKey = data?.alphavantage_api_key;
  }

  if (!apiKey) {
    apiKey = process.env.ALPHAVANTAGE_API_KEY;
  }

  if (!apiKey) {
    logError('fetchAlphaVantageCandles', new Error('No Alpha Vantage API key available'));
    return null;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${encodeURIComponent(fromSymbol)}&to_symbol=${encodeURIComponent(toSymbol)}&interval=${encodeURIComponent(interval)}&apikey=${apiKey}`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      logError('fetchAlphaVantageCandles', new Error(`HTTP ${res.status}`));
      return null;
    }

    const data = await res.json();
    const key = `Time Series FX (${interval})`;
    const series = data[key];

    if (!series || typeof series !== 'object') {
      // Check for rate limit message
      if (data['Note'] || data['Information']) {
        logError('fetchAlphaVantageCandles', new Error('Rate limited or API message'));
      }
      return null;
    }

    return Object.keys(series)
      .map(timestamp => {
        const item = series[timestamp];
        return {
          time: Math.floor(new Date(timestamp).getTime() / 1000),
          open: parseFloat(item['1. open']),
          high: parseFloat(item['2. high']),
          low: parseFloat(item['3. low']),
          close: parseFloat(item['4. close']),
        };
      })
      .filter(c => !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_CANDLES);
  } catch (error) {
    logError('fetchAlphaVantageCandles', error);
    return null;
  }
}

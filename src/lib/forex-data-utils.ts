
export interface Candlestick {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const BASE_PRICES: Record<string, number> = {
  'EURUSD': 1.0820,
  'GBPUSD': 1.2650,
  'USDJPY': 149.20,
  'USDCHF': 0.8850,
  'AUDUSD': 0.6520,
  'USDCAD': 1.3580,
  'NZDUSD': 0.6120,
  'XAUUSD': 2350.00,
  'XAGUSD': 28.50,
  'EURJPY': 161.50,
  'GBPJPY': 188.70,
  'EURGBP': 0.8550,
  'DEFAULT': 1.0000
};

export function getMockBasePrice(pair: string): number {
  return BASE_PRICES[pair] || BASE_PRICES['DEFAULT'];
}

/**
 * Maps a currency pair or commodity to its Yahoo Finance symbol.
 */
export function mapSymbolToYahoo(pair: string): string {
  if (pair.includes('=X') || pair.includes('=F')) return pair;
  
  const map: Record<string, string> = {
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X',
    'USDCHF': 'USDCHF=X',
    'AUDUSD': 'AUDUSD=X',
    'USDCAD': 'USDCAD=X',
    'NZDUSD': 'NZDUSD=X',
    'XAUUSD': 'GC=F', // Gold Futures
    'XAGUSD': 'SI=F', // Silver Futures
    'EURJPY': 'EURJPY=X',
    'GBPJPY': 'GBPJPY=X',
    'EURGBP': 'EURGBP=X'
  };
  
  return map[pair] || `${pair}=X`;
}

/**
 * Maps dashboard timeframe names to Yahoo Finance intervals.
 */
export function mapTimeframeToYahooInterval(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1H': '1h',
    'D': '1d',
    'W': '1wk',
    'M': '1mo'
  };
  return map[tf] || '1h';
}

/**
 * Deprecated mapping for Finnhub. Keeping signature compatibility for safety.
 */
export function mapSymbolToFinnhub(pair: string): string {
  return mapSymbolToYahoo(pair);
}

export function mapTimeframeToResolution(tf: string): string {
  return mapTimeframeToYahooInterval(tf);
}

export function generateMockForexData(basePrice: number, count: number = 200): Candlestick[] {
  const data: Candlestick[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  const isMetal = basePrice > 1000 || basePrice < 50;
  const baseVolume = isMetal ? 50000 : 1000000;
  
  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 3600000); 
    const volatility = basePrice * 0.005;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(baseVolume * (0.5 + Math.random()));
    
    data.push({
      time: time.getTime() / 1000,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
      volume
    });
    currentPrice = close;
  }
  return data;
}

export function calculateSMA(data: Candlestick[], period: number) {
  const sma: { time: string | number; value: number }[] = [];
  if (data.length < period) return sma;
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    sma.push({ time: data[i].time, value: Number((sum / period).toFixed(5)) });
  }
  return sma;
}

export function calculateEMA(data: Candlestick[], period: number) {
  const ema: { time: string | number; value: number }[] = [];
  if (data.length === 0) return ema;
  const k = 2 / (period + 1);
  let emaValue = data[0].close;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) ema.push({ time: data[i].time, value: emaValue });
    else {
      emaValue = (data[i].close - emaValue) * k + emaValue;
      ema.push({ time: data[i].time, value: Number(emaValue.toFixed(5)) });
    }
  }
  return ema;
}

export function calculateRSI(data: Candlestick[], period: number = 14) {
  const rsi: { time: string | number; value: number }[] = [];
  if (data.length <= period) return rsi;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const diff = data[i].close - data[i - 1].close;
      avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({ time: data[i].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });
  }
  return rsi;
}

export function calculateMACD(data: Candlestick[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    const f = emaFast.find(e => e.time === data[i].time);
    const s = emaSlow.find(e => e.time === data[i].time);
    if (f && s) macdLine.push({ time: data[i].time, value: Number((f.value - s.value).toFixed(5)) });
  }
  const signalLine = calculateEMA(macdLine.map(m => ({ ...m, open: m.value, high: m.value, low: m.value, close: m.value })) as any, signal);
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    const sig = signalLine.find(s => s.time === macdLine[i].time);
    if (sig) histogram.push({ time: macdLine[i].time, value: Number((macdLine[i].value - sig.value).toFixed(5)) });
  }
  return { line: macdLine, signal: signalLine, histogram };
}

export function detectPatterns(data: Candlestick[]) {
  const markers = [];
  for (let i = 2; i < data.length; i++) {
    const prev2 = data[i - 2], prev = data[i - 1], curr = data[i];
    const bodySize = Math.abs(curr.close - curr.open), totalSize = curr.high - curr.low;
    const upperWick = curr.high - Math.max(curr.open, curr.close), lowerWick = Math.min(curr.open, curr.close) - curr.low;
    
    if (prev.close < prev.open && curr.close > curr.open && curr.open <= prev.close && curr.close >= prev.open) {
      markers.push({ time: curr.time, position: 'belowBar', color: '#4ade80', shape: 'arrowUp', text: 'Bullish Engulfing' });
    }
    if (prev.close > prev.open && curr.close < curr.open && curr.open >= prev.close && curr.close <= prev.open) {
      markers.push({ time: curr.time, position: 'aboveBar', color: '#f87171', shape: 'arrowDown', text: 'Bearish Engulfing' });
    }
    if (bodySize <= totalSize * 0.1) markers.push({ time: curr.time, position: 'inBar', color: '#9ca3af', shape: 'circle', text: 'Doji' });
    if (lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5) markers.push({ time: curr.time, position: 'belowBar', color: '#3b82f6', shape: 'arrowUp', text: 'Hammer' });
    if (upperWick >= bodySize * 2 && lowerWick <= bodySize * 0.5) markers.push({ time: curr.time, position: 'aboveBar', color: '#f59e0b', shape: 'arrowDown', text: 'Shooting Star' });
  }
  return markers;
}

export async function fetchMarketNews(apiKey?: string) {
  // Use a public news source or simulator
  return [
    { headline: "Yahoo Market Update: Dollar steady ahead of PCE inflation data.", datetime: Date.now() / 1000 },
    { headline: "Gold hits new highs as central bank buying continues.", datetime: Date.now() / 1000 - 3600 },
    { headline: "Eurozone PMI data suggests cooling economic activity.", datetime: Date.now() / 1000 - 7200 }
  ];
}

export async function fetchEconomicCalendar(apiKey?: string) {
  return [
    { country: 'USD', event: 'PCE Price Index (MoM)', impact: 'high', time: new Date().toISOString(), prev: '0.3%', estimate: '0.2%' },
    { country: 'EUR', event: 'Consumer Confidence', impact: 'medium', time: new Date().toISOString(), prev: '-15.5', estimate: '-15.0' }
  ];
}

export function calculatePositionSize(
  balance: number,
  riskPercent: number,
  stopLossPips: number,
  isJpy: boolean = false
) {
  if (stopLossPips <= 0) return 0;
  const amountToRisk = balance * (riskPercent / 100);
  const pipValuePerStandardLot = isJpy ? 6.70 : 10.00; 
  const lotSize = amountToRisk / (stopLossPips * pipValuePerStandardLot);
  return Number(lotSize.toFixed(2));
}

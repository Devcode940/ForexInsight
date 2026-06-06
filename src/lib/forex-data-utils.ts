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

export function mapSymbolToFinnhub(pair: string): string {
  if (pair.includes(':')) return pair; 
  if (pair === 'XAUUSD') return 'OANDA:XAU_USD';
  if (pair === 'XAGUSD') return 'OANDA:XAG_USD';
  if (pair.length === 6) return `OANDA:${pair.substring(0, 3)}_${pair.substring(3, 6)}`;
  return pair;
}

export function mapTimeframeToResolution(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1H': '60', 'D': 'D', 'W': 'W', 'M': 'M'
  };
  return map[tf] || '60';
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

export async function fetchMarketNews(apiKey: string) {
  if (!apiKey) return [{ headline: "Simulator: Fed likely to hold rates steady", datetime: Date.now() / 1000 }];
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=forex&token=${apiKey}`);
    return await res.json();
  } catch (e) {
    return [];
  }
}

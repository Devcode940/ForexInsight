export interface Candlestick {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Realistic base prices for different trading instruments
 */
const BASE_PRICES: Record<string, number> = {
  // Major Currency Pairs
  'EURUSD': 1.0820,
  'GBPUSD': 1.2650,
  'USDJPY': 149.20,
  'USDCHF': 0.8850,
  'AUDUSD': 0.6520,
  'USDCAD': 1.3580,
  'NZDUSD': 0.6120,
  
  // Precious Metals
  'XAUUSD': 2350.00,  // Gold
  'XAGUSD': 28.50,     // Silver
  
  // Cross Pairs
  'EURJPY': 161.50,
  'GBPJPY': 188.70,
  'EURGBP': 0.8550,
  'AUDJPY': 97.30,
  'EURAUD': 1.6550,
  'EURCHF': 0.9580,
  'GBPAUD': 1.9350,
  'GBPCHF': 1.1200,
  
  // Default fallback
  'DEFAULT': 1.0000
};

/**
 * Get realistic base price for a given trading pair
 */
export function getMockBasePrice(pair: string): number {
  return BASE_PRICES[pair] || BASE_PRICES['DEFAULT'];
}

/**
 * Determine instrument type for volume calculations
 */
function getInstrumentType(pair: string): 'forex' | 'metal' {
  if (pair.startsWith('XAU') || pair.startsWith('XAG')) {
    return 'metal';
  }
  return 'forex';
}

/**
 * Maps dashboard symbols to Finnhub/OANDA format
 */
export function mapSymbolToFinnhub(pair: string): string {
  if (pair.includes(':')) return pair; // Already mapped
  
  // Specific overrides
  if (pair === 'XAUUSD') return 'OANDA:XAU_USD';
  if (pair === 'XAGUSD') return 'OANDA:XAG_USD';
  
  // Standard FX mapping: EURUSD -> OANDA:EUR_USD
  if (pair.length === 6) {
    return `OANDA:${pair.substring(0, 3)}_${pair.substring(3, 6)}`;
  }
  
  return pair;
}

/**
 * Maps UI timeframes to Finnhub resolutions
 */
export function mapTimeframeToResolution(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1H': '60',
    '4H': '60', // Finnhub free doesn't always support 240, defaulting to 60
    'D': 'D',
    'W': 'W',
    'M': 'M'
  };
  return map[tf] || '60';
}

export function generateMockForexData(basePrice: number, count: number = 200): Candlestick[] {
  const data: Candlestick[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  // Determine appropriate volume scale based on instrument type
  const isMetal = basePrice > 1000 || basePrice < 50; // Simple heuristic for Gold/Silver
  const baseVolume = isMetal ? 50000 : 1000000;
  
  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 3600000); // 1h intervals
    const volatility = basePrice * 0.005;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    // Generate realistic volume with variation (50% to 150% of base)
    const volumeVariation = 0.5 + Math.random();
    const volume = Math.floor(baseVolume * volumeVariation);
    
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
    sma.push({
      time: data[i].time,
      value: Number((sum / period).toFixed(5))
    });
  }
  return sma;
}

export function calculateEMA(data: Candlestick[], period: number) {
  const ema: { time: string | number; value: number }[] = [];
  if (data.length === 0) return ema;
  const k = 2 / (period + 1);
  let emaValue = data[0].close;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push({ time: data[i].time, value: emaValue });
    } else {
      emaValue = (data[i].close - emaValue) * k + emaValue;
      ema.push({ time: data[i].time, value: Number(emaValue.toFixed(5)) });
    }
  }
  return ema;
}

export function calculateRSI(data: Candlestick[], period: number = 14) {
  const rsi: { time: string | number; value: number }[] = [];
  if (data.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const diff = data[i].close - data[i - 1].close;
      const currentGain = diff >= 0 ? diff : 0;
      const currentLoss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({
      time: data[i].time,
      value: Number((100 - 100 / (1 + rs)).toFixed(2))
    });
  }

  return rsi;
}

export function detectPatterns(data: Candlestick[]) {
  const markers = [];
  
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    
    const bodySize = Math.abs(curr.close - curr.open);
    const totalSize = curr.high - curr.low;
    const upperWick = curr.high - Math.max(curr.open, curr.close);
    const lowerWick = Math.min(curr.open, curr.close) - curr.low;
    
    // 1. Bullish Engulfing
    const isPrevBearish = prev.close < prev.open;
    const isCurrBullish = curr.close > curr.open;
    const engulfsBullish = curr.open <= prev.close && curr.close >= prev.open;
    if (isPrevBearish && isCurrBullish && engulfsBullish) {
      markers.push({
        time: curr.time,
        position: 'belowBar',
        color: '#4ade80',
        shape: 'arrowUp',
        text: 'Bullish Engulfing'
      });
    }

    // 2. Bearish Engulfing
    const isPrevBullish = prev.close > prev.open;
    const isCurrBearish = curr.close < curr.open;
    const engulfsBearish = curr.open >= prev.close && curr.close <= prev.open;
    if (isPrevBullish && isCurrBearish && engulfsBearish) {
      markers.push({
        time: curr.time,
        position: 'aboveBar',
        color: '#f87171',
        shape: 'arrowDown',
        text: 'Bearish Engulfing'
      });
    }

    // 3. Doji
    if (bodySize <= totalSize * 0.1) {
      markers.push({
        time: curr.time,
        position: 'inBar',
        color: '#9ca3af',
        shape: 'circle',
        text: 'Doji'
      });
    }

    // 4. Hammer
    if (lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5) {
      markers.push({
        time: curr.time,
        position: 'belowBar',
        color: '#3b82f6',
        shape: 'arrowUp',
        text: 'Hammer'
      });
    }

    // 5. Shooting Star
    if (upperWick >= bodySize * 2 && lowerWick <= bodySize * 0.5) {
      markers.push({
        time: curr.time,
        position: 'aboveBar',
        color: '#f59e0b',
        shape: 'arrowDown',
        text: 'Shooting Star'
      });
    }
  }
  return markers;
}


export interface Candlestick {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function generateMockForexData(basePrice: number, count: number = 200): Candlestick[] {
  const data: Candlestick[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 3600000); // 1h intervals
    const volatility = basePrice * 0.005;
    const open = currentPrice;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    
    data.push({
      time: time.getTime() / 1000,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
      volume: Math.floor(Math.random() * 1000)
    });
    currentPrice = close;
  }
  
  return data;
}

export function calculateSMA(data: Candlestick[], period: number) {
  const sma: { time: string | number; value: number }[] = [];
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

export function calculateMACD(data: Candlestick[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);
  
  const macdLine: { time: string | number; value: number }[] = [];
  
  // Align fast and slow EMAs
  const startIdx = slowPeriod - 1;
  for (let i = startIdx; i < data.length; i++) {
    const fast = fastEma[i].value;
    const slow = slowEma[i].value;
    macdLine.push({
      time: data[i].time,
      value: Number((fast - slow).toFixed(5))
    });
  }

  // Signal line is EMA of MACD Line
  const k = 2 / (signalPeriod + 1);
  let signalValue = macdLine[0].value;
  const signalLine: { time: string | number; value: number }[] = [];
  const histogram: { time: string | number; value: number }[] = [];

  for (let i = 0; i < macdLine.length; i++) {
    if (i === 0) {
      signalValue = macdLine[0].value;
    } else {
      signalValue = (macdLine[i].value - signalValue) * k + signalValue;
    }
    
    signalLine.push({ time: macdLine[i].time, value: Number(signalValue.toFixed(5)) });
    histogram.push({ 
      time: macdLine[i].time, 
      value: Number((macdLine[i].value - signalValue).toFixed(5)) 
    });
  }

  return { macdLine, signalLine, histogram };
}

export function detectBullishEngulfing(data: Candlestick[]) {
  const markers = [];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    
    const isPrevBearish = prev.close < prev.open;
    const isCurrBullish = curr.close > curr.open;
    const engulfs = curr.open <= prev.close && curr.close >= prev.open;
    
    if (isPrevBearish && isCurrBullish && engulfs) {
      markers.push({
        time: curr.time,
        position: 'belowBar',
        color: '#4ade80',
        shape: 'arrowUp',
        text: 'Bullish Engulfing',
      });
    }
  }
  return markers;
}

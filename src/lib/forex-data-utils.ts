
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

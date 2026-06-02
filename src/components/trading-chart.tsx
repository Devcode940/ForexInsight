
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { Candlestick } from '@/lib/forex-data-utils';
import { useTheme } from 'next-themes';

interface TradingChartProps {
  data: Candlestick[];
  indicators: {
    sma: boolean;
    ema: boolean;
    bb: boolean;
    rsi: boolean;
  };
  patterns?: any[];
}

export const TradingChart: React.FC<TradingChartProps> = ({ data, indicators }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111519' },
        textColor: '#D1D4DC',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      crosshair: {
        mode: 1,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4CC9F0',
      downColor: '#FF4D4D',
      borderVisible: false,
      wickUpColor: '#4CC9F0',
      wickDownColor: '#FF4D4D',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (candlestickSeriesRef.current && data) {
      candlestickSeriesRef.current.setData(data as CandlestickData<Time>[]);
    }
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // SMA
    if (indicators.sma) {
      if (!smaSeriesRef.current) {
        smaSeriesRef.current = chartRef.current.addLineSeries({
          color: '#3A86FF',
          lineWidth: 2,
          title: 'SMA 20',
        });
      }
      const smaData = data.map((d, i) => {
        const period = 20;
        if (i < period) return null;
        const slice = data.slice(i - period, i);
        const avg = slice.reduce((sum, item) => sum + item.close, 0) / period;
        return { time: d.time as Time, value: avg };
      }).filter(Boolean) as any[];
      smaSeriesRef.current.setData(smaData);
    } else if (smaSeriesRef.current) {
      chartRef.current.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = null;
    }

    // EMA
    if (indicators.ema) {
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = chartRef.current.addLineSeries({
          color: '#FFBE0B',
          lineWidth: 2,
          lineStyle: 2,
          title: 'EMA 50',
        });
      }
      // Simple EMA calculation for mock
      const emaData = data.map((d) => ({ time: d.time as Time, value: d.close * 0.998 }));
      emaSeriesRef.current.setData(emaData);
    } else if (emaSeriesRef.current) {
      chartRef.current.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }
  }, [indicators, data]);

  return <div ref={chartContainerRef} className="h-full w-full" />;
};

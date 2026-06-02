
'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { Candlestick } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';

interface TradingChartProps {
  data: Candlestick[];
  indicators: IndicatorsState;
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
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#D1D4DC',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
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
    if (!chartRef.current || !data || data.length === 0) return;

    // SMA Logic
    if (indicators.sma.enabled) {
      if (!smaSeriesRef.current) {
        smaSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.sma.color,
          lineWidth: 2,
          title: `SMA ${indicators.sma.period}`,
        });
      } else {
        smaSeriesRef.current.applyOptions({ title: `SMA ${indicators.sma.period}`, color: indicators.sma.color });
      }
      
      const period = indicators.sma.period;
      const smaData = data.map((d, i) => {
        if (i < period) return null;
        const slice = data.slice(i - period + 1, i + 1);
        const avg = slice.reduce((sum, item) => sum + item.close, 0) / period;
        return { time: d.time as Time, value: avg };
      }).filter((item): item is { time: Time; value: number } => item !== null);
      
      smaSeriesRef.current.setData(smaData);
    } else if (smaSeriesRef.current) {
      chartRef.current.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = null;
    }

    // EMA Logic
    if (indicators.ema.enabled) {
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.ema.color,
          lineWidth: 2,
          lineStyle: 2,
          title: `EMA ${indicators.ema.period}`,
        });
      } else {
        emaSeriesRef.current.applyOptions({ title: `EMA ${indicators.ema.period}`, color: indicators.ema.color });
      }

      const period = indicators.ema.period;
      const k = 2 / (period + 1);
      let emaValue = data[0].close;
      const emaData = data.map((d, i) => {
        if (i === 0) {
          emaValue = d.close;
        } else {
          emaValue = (d.close - emaValue) * k + emaValue;
        }
        return { time: d.time as Time, value: emaValue };
      });
      
      emaSeriesRef.current.setData(emaData);
    } else if (emaSeriesRef.current) {
      chartRef.current.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }
  }, [indicators, data]);

  return <div ref={chartContainerRef} className="h-full w-full" />;
};

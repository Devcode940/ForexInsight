'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time,
  SeriesMarker
} from 'lightweight-charts';
import { Candlestick, detectPatterns } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';

interface TradingChartProps {
  data: Candlestick[];
  indicators: IndicatorsState;
}

export interface TradingChartHandle {
  resetView: () => void;
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ data, indicators }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#D1D4DC',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.05)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.05)' },
      },
      crosshair: {
        mode: 1,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        rightOffset: 12,
        barSpacing: 6,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        autoScale: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4CC9F0',
      downColor: '#FF4D4D',
      borderVisible: false,
      wickUpColor: '#4CC9F0',
      wickDownColor: '#FF4D4D',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay on main pane
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (candlestickSeriesRef.current && data.length > 0) {
      candlestickSeriesRef.current.setData(data as CandlestickData<Time>[]);
      
      if (volumeSeriesRef.current) {
        const volumeData = data.map(d => ({
          time: d.time as Time,
          value: d.volume || 0,
          color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

      const rawMarkers = detectPatterns(data);
      const markers = rawMarkers.map(m => ({
        ...m,
        text: indicators.showPatternLabels ? (m as any).text : undefined
      })) as SeriesMarker<Time>[];
      
      candlestickSeriesRef.current.setMarkers(markers);
      
      // Auto-fit on load if it's the first time
      if (chartRef.current && data.length > 0) {
        // Only fit if data has changed significantly or first load
      }
    }
  }, [data, indicators.showPatternLabels]);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: indicators.volume.enabled });
    }

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
        if (i === 0) emaValue = d.close;
        else emaValue = (d.close - emaValue) * k + emaValue;
        return { time: d.time as Time, value: emaValue };
      });
      emaSeriesRef.current.setData(emaData);
    } else if (emaSeriesRef.current) {
      chartRef.current.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }

    if (indicators.rsi.enabled) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addLineSeries({
          color: indicators.rsi.color,
          lineWidth: 2,
          title: 'RSI',
          priceScaleId: 'rsi-scale',
        });
        chartRef.current.priceScale('rsi-scale').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0.05 },
        });
      }
      const { calculateRSI } = require('@/lib/forex-data-utils');
      const rsiData = calculateRSI(data, indicators.rsi.period);
      rsiSeriesRef.current.setData(rsiData);
    } else if (rsiSeriesRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }
  }, [indicators, data]);

  return <div ref={chartContainerRef} className="h-full w-full" />;
});

TradingChart.displayName = 'TradingChart';
'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  Time,
  SeriesMarker,
  IPriceLine
} from 'lightweight-charts';
import { Candlestick, detectPatterns, calculateRSI, calculateSMA, calculateEMA, calculateMACD } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';

interface TradingChartProps {
  data: Candlestick[];
  indicators: IndicatorsState;
  signal?: ExplainableTradeSignalsOutput;
}

export interface TradingChartHandle {
  resetView: () => void;
  getVisibleData: () => Candlestick[];
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ data, indicators, signal }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    },
    getVisibleData: () => {
      if (!chartRef.current || data.length === 0) return [];
      const timeScale = chartRef.current.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return data.slice(-100);
      const fromIndex = Math.max(0, Math.floor(logicalRange.from));
      const toIndex = Math.min(data.length - 1, Math.ceil(logicalRange.to));
      return data.slice(fromIndex, toIndex + 1);
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
      crosshair: { mode: 1 },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        borderColor: '#2B2B43',
        rightOffset: 12,
        barSpacing: 6,
      },
      rightPriceScale: { borderColor: '#2B2B43', autoScale: true },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4CC9F0',
      downColor: '#FF4D4D',
      wickUpColor: '#4CC9F0',
      wickDownColor: '#FF4D4D',
      borderVisible: false,
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
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

      const markers = detectPatterns(data).map(m => ({
        ...m,
        text: indicators.showPatternLabels ? (m as any).text : undefined
      })) as SeriesMarker<Time>[];
      
      candlestickSeriesRef.current.setMarkers(markers);
    }
  }, [data, indicators.showPatternLabels]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: indicators.volume.enabled });
    }

    // SMA
    if (indicators.sma.enabled) {
      if (!smaSeriesRef.current) {
        smaSeriesRef.current = chartRef.current.addLineSeries({ color: indicators.sma.color, lineWidth: 2, title: `SMA ${indicators.sma.period}` });
      }
      smaSeriesRef.current.setData(calculateSMA(data, indicators.sma.period) as any);
    } else if (smaSeriesRef.current) {
      chartRef.current.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = null;
    }

    // EMA
    if (indicators.ema.enabled) {
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = chartRef.current.addLineSeries({ color: indicators.ema.color, lineWidth: 2, lineStyle: 2, title: `EMA ${indicators.ema.period}` });
      }
      emaSeriesRef.current.setData(calculateEMA(data, indicators.ema.period) as any);
    } else if (emaSeriesRef.current) {
      chartRef.current.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }

    // RSI
    if (indicators.rsi.enabled) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chartRef.current.addLineSeries({ color: indicators.rsi.color, lineWidth: 2, title: 'RSI', priceScaleId: 'rsi' });
        chartRef.current.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0.05 } });
      }
      rsiSeriesRef.current.setData(calculateRSI(data, indicators.rsi.period) as any);
    } else if (rsiSeriesRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
    }

    // MACD
    if (indicators.macd.enabled) {
      const macd = calculateMACD(data);
      if (!macdSeriesRef.current) {
        macdSeriesRef.current = chartRef.current.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'MACD', priceScaleId: 'macd' });
        macdSignalSeriesRef.current = chartRef.current.addLineSeries({ color: '#FF5252', lineWidth: 1, title: 'Signal', priceScaleId: 'macd' });
        macdHistogramSeriesRef.current = chartRef.current.addHistogramSeries({ priceScaleId: 'macd' });
        chartRef.current.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0.05 } });
      }
      macdSeriesRef.current.setData(macd.line as any);
      macdSignalSeriesRef.current.setData(macd.signal as any);
      macdHistogramSeriesRef.current.setData(macd.histogram.map(h => ({
        ...h,
        color: h.value >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      })) as any);
    } else if (macdSeriesRef.current) {
      chartRef.current.removeSeries(macdSeriesRef.current!);
      chartRef.current.removeSeries(macdSignalSeriesRef.current!);
      chartRef.current.removeSeries(macdHistogramSeriesRef.current!);
      macdSeriesRef.current = null;
    }
  }, [indicators, data]);

  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    
    // Clear old lines
    if (entryLineRef.current) candlestickSeriesRef.current.removePriceLine(entryLineRef.current);
    if (slLineRef.current) candlestickSeriesRef.current.removePriceLine(slLineRef.current);
    if (tpLineRef.current) candlestickSeriesRef.current.removePriceLine(tpLineRef.current);

    if (signal) {
      const entryPrice = parseFloat(signal.entryZone.split('-')[0].trim()) || data[data.length-1].close;
      
      entryLineRef.current = candlestickSeriesRef.current.createPriceLine({
        price: entryPrice,
        color: '#4CC9F0',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'Entry',
      });
      
      slLineRef.current = candlestickSeriesRef.current.createPriceLine({
        price: signal.stopLoss,
        color: '#FF4D4D',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });
      
      tpLineRef.current = candlestickSeriesRef.current.createPriceLine({
        price: signal.takeProfit,
        color: '#4ADE80',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });
    }
  }, [signal]);

  return <div ref={chartContainerRef} className="h-full w-full" />;
});

TradingChart.displayName = 'TradingChart';
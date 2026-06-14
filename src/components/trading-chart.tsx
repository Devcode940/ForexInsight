
'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  LineData,
  Time,
  SeriesMarker,
  IPriceLine,
  MouseEventParams
} from 'lightweight-charts';
import { Candlestick, detectPatterns, calculateRSI, calculateSMA, calculateEMA, calculateMACD } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';
import { Button } from '@/components/ui/button';
import { Trash2, Hash, ArrowDownNarrowWide, Maximize2, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TradingChartProps {
  data: Candlestick[];
  indicators: IndicatorsState;
  signal?: any;
  symbol: string;
  timeframe: string;
}

export interface TradingChartHandle {
  resetView: () => void;
  getVisibleData: () => Candlestick[];
}

export const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ data, indicators, signal, symbol, timeframe }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
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

  const manualLinesRef = useRef<IPriceLine[]>([]);
  const [drawMode, setDrawMode] = useState<'none' | 'hline' | 'vline'>('none');

  useImperativeHandle(ref, () => ({
    resetView: () => chartRef.current?.timeScale().fitContent(),
    getVisibleData: () => {
      if (!chartRef.current || data.length === 0) return [];
      const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();
      if (!logicalRange) return data.slice(-100);
      const startIdx = Math.max(0, Math.floor(logicalRange.from));
      const endIdx = Math.min(data.length - 1, Math.ceil(logicalRange.to));
      return data.slice(startIdx, endIdx + 1);
    }
  }));

  const clearManualDrawings = () => {
    if (!mainSeriesRef.current) return;
    manualLinesRef.current.forEach(line => {
      try { mainSeriesRef.current?.removePriceLine(line); } catch (e) {}
    });
    manualLinesRef.current = [];
  };

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0B0E11' }, textColor: '#D1D4DC' },
      grid: { vertLines: { color: 'rgba(42, 46, 57, 0.05)' }, horzLines: { color: 'rgba(42, 46, 57, 0.05)' } },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { timeVisible: true, borderColor: '#2B2B43', rightOffset: 12 },
      rightPriceScale: { borderColor: '#2B2B43' },
    });

    chart.applyOptions({
      watermark: { 
        color: 'rgba(255, 255, 255, 0.03)', 
        visible: true, 
        text: `${symbol} • ${timeframe} • ANALYSIS MODE`, 
        fontSize: 24, 
        horzAlign: 'center', 
        vertAlign: 'center' 
      },
    });

    chartRef.current = chart;

    const volumeSeries = chart.addHistogramSeries({ 
      color: '#26a69a', 
      priceFormat: { type: 'volume' }, 
      priceScaleId: '' 
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    const handleChartClick = (param: MouseEventParams) => {
      if (!mainSeriesRef.current || !param.price) return;

      if (drawMode === 'hline') {
        const line = mainSeriesRef.current.createPriceLine({
          price: param.price, color: '#3A86FF', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Analysis Level'
        });
        manualLinesRef.current.push(line);
        setDrawMode('none');
      }
    };

    chart.subscribeClick(handleChartClick);

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeClick(handleChartClick);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [symbol, timeframe, drawMode]);

  // Handle Main Series
  useEffect(() => {
    if (!chartRef.current) return;
    
    if (mainSeriesRef.current) {
      try { chartRef.current.removeSeries(mainSeriesRef.current); } catch (e) {}
    }

    if (indicators.chartType === 'line') {
      mainSeriesRef.current = chartRef.current.addLineSeries({ color: '#4CC9F0', lineWidth: 2, title: symbol });
    } else {
      mainSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#4CC9F0', downColor: '#FF4D4D', wickUpColor: '#4CC9F0', wickDownColor: '#FF4D4D', borderVisible: false
      });
    }
  }, [indicators.chartType, symbol]);

  // Update Data
  useEffect(() => {
    if (mainSeriesRef.current && data.length > 0) {
      if (indicators.chartType === 'line') {
        (mainSeriesRef.current as ISeriesApi<'Line'>).setData(data.map(d => ({ time: d.time as Time, value: d.close })));
      } else {
        (mainSeriesRef.current as ISeriesApi<'Candlestick'>).setData(data as CandlestickData<Time>[]);
      }

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(data.map(d => ({
          time: d.time as Time, value: d.volume || 0, color: d.close >= d.open ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)'
        })));
      }

      mainSeriesRef.current.setMarkers(detectPatterns(data).map(m => ({
        ...m, text: indicators.showPatternLabels ? m.text : undefined
      })) as SeriesMarker<Time>[]);
    }
  }, [data, indicators.showPatternLabels, indicators.chartType]);

  // Indicators
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    const chart = chartRef.current;

    // SMA
    if (indicators.sma.enabled) {
      if (!smaSeriesRef.current) smaSeriesRef.current = chart.addLineSeries({ color: indicators.sma.color, lineWidth: 2, title: `SMA ${indicators.sma.period}` });
      smaSeriesRef.current.setData(calculateSMA(data, indicators.sma.period) as any);
    } else if (smaSeriesRef.current) { 
      try { chart.removeSeries(smaSeriesRef.current); } catch(e) {}
      smaSeriesRef.current = null; 
    }

    // EMA
    if (indicators.ema.enabled) {
      if (!emaSeriesRef.current) emaSeriesRef.current = chart.addLineSeries({ color: indicators.ema.color, lineWidth: 2, lineStyle: 2, title: `EMA ${indicators.ema.period}` });
      emaSeriesRef.current.setData(calculateEMA(data, indicators.ema.period) as any);
    } else if (emaSeriesRef.current) { 
      try { chart.removeSeries(emaSeriesRef.current); } catch(e) {}
      emaSeriesRef.current = null; 
    }

    // RSI
    if (indicators.rsi.enabled) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = chart.addLineSeries({ color: indicators.rsi.color, lineWidth: 2, title: 'RSI', priceScaleId: 'rsi' });
        chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0.05 } });
      }
      rsiSeriesRef.current.setData(calculateRSI(data, indicators.rsi.period) as any);
    } else if (rsiSeriesRef.current) { 
      try { chart.removeSeries(rsiSeriesRef.current); } catch(e) {}
      rsiSeriesRef.current = null; 
    }

    // MACD
    if (indicators.macd.enabled) {
      const macd = calculateMACD(data);
      if (!macdSeriesRef.current) {
        macdSeriesRef.current = chart.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'MACD', priceScaleId: 'macd' });
        macdSignalSeriesRef.current = chart.addLineSeries({ color: '#FF5252', lineWidth: 1, title: 'Signal', priceScaleId: 'macd' });
        macdHistogramSeriesRef.current = chart.addHistogramSeries({ priceScaleId: 'macd' });
        chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0.05 } });
      }
      macdSeriesRef.current.setData(macd.line as any);
      macdSignalSeriesRef.current.setData(macd.signal as any);
      macdHistogramSeriesRef.current.setData(macd.histogram.map(h => ({ ...h, color: h.value >= 0 ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)' })) as any);
    } else if (macdSeriesRef.current) {
      try {
        chart.removeSeries(macdSeriesRef.current); 
        chart.removeSeries(macdSignalSeriesRef.current!); 
        chart.removeSeries(macdHistogramSeriesRef.current!);
      } catch(e) {}
      macdSeriesRef.current = null;
    }
  }, [indicators, data]);

  // AI Visual Levels
  useEffect(() => {
    if (!mainSeriesRef.current) return;
    const series = mainSeriesRef.current;

    if (entryLineRef.current) try { series.removePriceLine(entryLineRef.current); } catch(e) {}
    if (slLineRef.current) try { series.removePriceLine(slLineRef.current); } catch(e) {}
    if (tpLineRef.current) try { series.removePriceLine(tpLineRef.current); } catch(e) {}

    if (signal && data.length > 0) {
      const entryPrice = parseFloat(signal.entryZone?.split('-')[0]) || data[data.length-1].close;
      entryLineRef.current = series.createPriceLine({ price: entryPrice, color: '#4CC9F0', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'AI Entry' });
      slLineRef.current = series.createPriceLine({ price: signal.stopLoss, color: '#FF4D4D', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'AI SL' });
      tpLineRef.current = series.createPriceLine({ price: signal.takeProfit, color: '#4ADE80', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'AI TP' });
    }
  }, [signal, data]);

  return (
    <div className="relative h-full w-full group">
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2 p-1 bg-background/50 backdrop-blur-md rounded-lg border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon" className={cn("h-8 w-8", drawMode === 'hline' && "bg-primary text-primary-foreground")}
                onClick={() => setDrawMode(drawMode === 'hline' ? 'none' : 'hline')}
              >
                <Hash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Horizontal Analysis Level</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearManualDrawings}>
                <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Clear Manual Drawings</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => chartRef.current?.timeScale().fitContent()}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Fit to Screen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                onClick={() => window.location.reload()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Reset Session</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div ref={chartContainerRef} className="h-full w-full" />
    </div>
  );
});

TradingChart.displayName = 'TradingChart';

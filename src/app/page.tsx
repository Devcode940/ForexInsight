
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WatchlistSidebar } from '@/components/watchlist-sidebar';
import { TradingChart } from '@/components/trading-chart';
import { AnalysisPanel } from '@/components/analysis-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  BarChart2, 
  Layers, 
  Activity, 
  Zap, 
  Maximize2,
  LineChart,
  Waves,
  TrendingUp
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateMockForexData, Candlestick } from '@/lib/forex-data-utils';
import { getExplainableTradeSignals, ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { detectCandlestickPatterns } from '@/ai/flows/candlestick-pattern-recognition';
import { cn } from '@/lib/utils';

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', 'Daily'];

export default function DashboardPage() {
  const [activePair, setActivePair] = useState('EURUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [data, setData] = useState<Candlestick[]>([]);
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: false,
    bb: false,
    rsi: true
  });
  
  // AI States
  const [signal, setSignal] = useState<ExplainableTradeSignalsOutput | undefined>();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Simulate loading data for pair
    const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
    setData(mockData);
  }, [activePair, activeTimeframe]);

  const runAnalysis = async () => {
    if (data.length < 20) return;
    setIsAnalyzing(true);
    try {
      const currentCandle = data[data.length - 1];
      const recentCandles = data.slice(-10);

      // Call GenAI Flow for Signals
      const result = await getExplainableTradeSignals({
        currencyPair: activePair,
        timeframe: activeTimeframe,
        currentCandle: {
          ...currentCandle,
          timestamp: Number(currentCandle.time) * 1000
        },
        recentCandles: recentCandles.map(c => ({
          ...c,
          timestamp: Number(c.time) * 1000
        })),
        indicators: {
          rsi: 62.5, // Mock current RSI
          sma: [{ period: 20, value: currentCandle.close * 0.999 }]
        }
      });
      setSignal(result);

      // Call GenAI Flow for Pattern Recognition
      const patternResult = await detectCandlestickPatterns({
        candles: recentCandles.map(c => ({
          ...c,
          time: new Date(Number(c.time) * 1000).toISOString()
        })),
        marketContext: `Strong bullish trend on ${activeTimeframe}`
      });
      setPatterns(patternResult.patterns);

    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(runAnalysis, 1000);
    return () => clearTimeout(timeout);
  }, [data]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Fixed Watchlist Sidebar */}
      <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} />

      {/* Main Chart Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header Controls */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card/30">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-headline font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              ForexInsight <span className="text-accent">AI</span>
            </h1>
            
            <div className="h-8 w-px bg-border" />

            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe}>
              <TabsList className="bg-muted/50 h-9">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger key={tf} value={tf} className="px-3 text-xs font-bold">{tf}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <div className="flex items-center bg-muted/30 rounded-lg p-1 mr-4 border border-border/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className={cn("h-8 w-8", indicators.sma && "text-primary bg-primary/10")}
                      onClick={() => setIndicators(prev => ({ ...prev, sma: !prev.sma }))}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle SMA</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className={cn("h-8 w-8", indicators.ema && "text-yellow-400 bg-yellow-400/10")}
                      onClick={() => setIndicators(prev => ({ ...prev, ema: !prev.ema }))}
                    >
                      <Waves className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle EMA</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className={cn("h-8 w-8", indicators.bb && "text-accent bg-accent/10")}
                      onClick={() => setIndicators(prev => ({ ...prev, bb: !prev.bb }))}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bollinger Bands</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 gap-2 shadow-lg shadow-primary/20"
            >
              <Zap className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analyzing..." : "Analyze Now"}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Settings2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Chart Viewport */}
        <div className="flex-1 relative bg-[#0B0E11]">
          <div className="absolute top-4 left-6 z-10 pointer-events-none">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-headline">{activePair}</span>
              <span className="text-sm font-mono text-muted-foreground">{activeTimeframe} · FX Market</span>
            </div>
            <div className="flex gap-4 mt-1">
              <div className="text-[10px] font-mono"><span className="text-muted-foreground mr-1">O:</span><span className="text-foreground">1.0842</span></div>
              <div className="text-[10px] font-mono"><span className="text-muted-foreground mr-1">H:</span><span className="text-green-400">1.0865</span></div>
              <div className="text-[10px] font-mono"><span className="text-muted-foreground mr-1">L:</span><span className="text-red-400">1.0831</span></div>
              <div className="text-[10px] font-mono"><span className="text-muted-foreground mr-1">C:</span><span className="text-foreground font-bold">1.0844</span></div>
            </div>
          </div>
          
          <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="bg-black/40 hover:bg-black/60 border-none backdrop-blur-sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="bg-black/40 hover:bg-black/60 border-none backdrop-blur-sm">
              <Activity className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-full w-full">
            <TradingChart data={data} indicators={indicators} />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <footer className="h-10 border-t bg-card/50 flex items-center justify-between px-4 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Real-time Data Streaming</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span>Server: Frankfurt AI-01</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Latency: 14ms</span>
            <span>UTC-5: 14:23:41</span>
          </div>
        </footer>
      </main>

      {/* Right Analysis Panel */}
      <AnalysisPanel signal={signal} patterns={patterns} isLoading={isAnalyzing} />
    </div>
  );
}

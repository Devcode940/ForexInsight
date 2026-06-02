'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WatchlistSidebar } from '@/components/watchlist-sidebar';
import { TradingChart, TradingChartHandle } from '@/components/trading-chart';
import { AnalysisPanel } from '@/components/analysis-panel';
import { IndicatorSettingsSidebar, IndicatorsState } from '@/components/indicator-settings-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  Activity, 
  Zap, 
  LineChart,
  RefreshCw,
  Maximize2,
  Share2,
  ChevronDown,
  Globe
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
import { fetchAlphaVantageData } from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', 'D'];

export default function DashboardPage() {
  const [activePair, setActivePair] = useState('EURUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [data, setData] = useState<Candlestick[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const chartRef = useRef<TradingChartHandle>(null);
  const { toast } = useToast();
  
  // Indicator State
  const [indicators, setIndicators] = useState<IndicatorsState>({
    sma: { enabled: true, period: 20, color: '#3A86FF' },
    ema: { enabled: false, period: 50, color: '#FFBE0B' },
    bb: { enabled: false, period: 20, color: '#00F5D4' },
    rsi: { enabled: true, period: 14, color: '#9D4EDD' }
  });
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);
  
  // AI States
  const [signal, setSignal] = useState<ExplainableTradeSignalsOutput | undefined>();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadMarketData = async () => {
    setIsLoadingData(true);
    try {
      // Attempt real data fetch
      // Map timeframe names to Alpha Vantage intervals
      const intervalMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '1H': '60min',
        '4H': '60min', // AV doesn't have 4H FX intraday directly in standard plan
        'D': 'daily'
      };

      const realData = await fetchAlphaVantageData(activePair, intervalMap[activeTimeframe] || '5min');
      
      if (realData && realData.length > 0) {
        setData(realData);
        setIsRealData(true);
      } else {
        // Fallback to mock data
        const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
        setData(mockData);
        setIsRealData(false);
      }
    } catch (error) {
      console.error("Data loading failed:", error);
      const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
      setData(mockData);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [activePair, activeTimeframe]);

  const runAnalysis = async () => {
    if (data.length < 20) return;
    setIsAnalyzing(true);
    try {
      const currentCandle = data[data.length - 1];
      const recentCandles = data.slice(-10);

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
          rsi: 62.5,
          sma: [{ period: indicators.sma.period, value: currentCandle.close * 0.999 }]
        }
      });
      setSignal(result);

      const patternResult = await detectCandlestickPatterns({
        candles: recentCandles.map(c => ({
          ...c,
          time: new Date(Number(c.time) * 1000).toISOString()
        })),
        marketContext: `Strong trend on ${activeTimeframe}`
      });
      setPatterns(patternResult.patterns);

    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not complete AI analysis of the current market state.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleIndicator = (key: keyof IndicatorsState) => {
    setIndicators(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Main Toolbar */}
        <header className="h-12 border-b flex items-center justify-between px-4 bg-sidebar/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors">
              <span className="text-sm font-bold tracking-tight">{activePair}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
            </div>
            
            <div className="h-4 w-px bg-border/50" />

            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe} className="h-8">
              <TabsList className="bg-transparent h-8 p-0 gap-1">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger 
                    key={tf} value={tf} 
                    className="h-7 px-2.5 text-[10px] font-bold border-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded"
                  >
                    {tf}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1.5 ml-2">
              <Badge variant={isRealData ? "default" : "secondary"} className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider">
                {isRealData ? <Globe className="w-2.5 h-2.5 mr-1" /> : null}
                {isRealData ? "Live" : "Mock"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className={cn("h-8 w-8", indicators.sma.enabled && "text-primary bg-primary/10")}
                      onClick={() => toggleIndicator('sma')}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>SMA</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className={cn("h-8 w-8", indicators.rsi.enabled && "text-purple-400 bg-purple-400/10")}
                      onClick={() => toggleIndicator('rsi')}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>RSI</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border/50 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => chartRef.current?.resetView()}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Chart</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="h-4 w-px bg-border/50 mx-2" />

            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing || isLoadingData}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-[10px] uppercase tracking-wider px-4 shadow-lg shadow-primary/20"
            >
              <Zap className={cn("w-3.5 h-3.5 mr-1.5", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analysing" : "Analise"}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8 text-muted-foreground", showIndicatorSettings && "text-primary bg-primary/10")}
              onClick={() => setShowIndicatorSettings(!showIndicatorSettings)}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Chart Viewport */}
        <div className="flex-1 relative bg-[#0B0E11] overflow-hidden">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Data...</span>
              </div>
            </div>
          )}

          {/* Chart Overlay Info */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-headline tracking-tighter text-foreground/90">{activePair}</span>
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
                {isRealData ? "ALPHA VANTAGE" : "SIMULATED"}
              </span>
            </div>
            {data.length > 0 && (
               <div className="flex gap-3 text-[10px] font-mono text-muted-foreground">
                <span>O: <span className="text-foreground font-bold">{data[data.length-1].open.toFixed(5)}</span></span>
                <span>H: <span className="text-foreground font-bold">{data[data.length-1].high.toFixed(5)}</span></span>
                <span>L: <span className="text-foreground font-bold">{data[data.length-1].low.toFixed(5)}</span></span>
                <span>C: <span className={cn("font-bold", data[data.length-1].close >= data[data.length-1].open ? "text-green-400" : "text-red-400")}>{data[data.length-1].close.toFixed(5)}</span></span>
              </div>
            )}
          </div>

          <div className="h-full w-full">
            <TradingChart ref={chartRef} data={data} indicators={indicators} />
          </div>
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t bg-sidebar/80 backdrop-blur-md flex items-center justify-between px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]", isRealData ? "bg-green-500" : "bg-blue-500")} />
              <span>{isRealData ? "Live Data" : "Mock Stream"}</span>
            </div>
            <div className="h-3 w-px bg-border/50" />
            <span>UTC: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>{isRealData ? "Source: Alpha Vantage" : "Offline Simulation"}</span>
            <div className="flex items-center gap-2">
              <Share2 className="w-3 h-3 cursor-pointer hover:text-foreground" />
              <Maximize2 className="w-3 h-3 cursor-pointer hover:text-foreground" />
            </div>
          </div>
        </footer>
      </main>

      {showIndicatorSettings ? (
        <IndicatorSettingsSidebar 
          indicators={indicators} 
          setIndicators={setIndicators} 
          onClose={() => setShowIndicatorSettings(false)} 
        />
      ) : (
        <AnalysisPanel signal={signal} patterns={patterns} isLoading={isAnalyzing} />
      )}
    </div>
  );
}

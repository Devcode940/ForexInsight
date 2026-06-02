
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WatchlistSidebar } from '@/components/watchlist-sidebar';
import { TradingChart, TradingChartHandle } from '@/components/trading-chart';
import { AnalysisPanel } from '@/components/analysis-panel';
import { IndicatorSettingsSidebar, IndicatorsState } from '@/components/indicator-settings-sidebar';
import { UserNav } from '@/components/user-nav';
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
  Globe,
  AlertTriangle,
  PanelLeft,
  PanelRight,
  MessageSquare,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateMockForexData, Candlestick, detectPatterns, mapSymbolToFinnhub, mapTimeframeToResolution } from '@/lib/forex-data-utils';
import { getExplainableTradeSignals, ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { detectCandlestickPatterns } from '@/ai/flows/candlestick-pattern-recognition';
import { fetchFinnhubCandles } from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { saveUserPreferences, getUserPreferences } from '@/lib/firebase/store';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', 'D', 'W', 'M'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activePair, setActivePair] = useState('XAUUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [data, setData] = useState<Candlestick[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const chartRef = useRef<TradingChartHandle>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Sidebar Visibility States
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);

  // Indicator State
  const [indicators, setIndicators] = useState<IndicatorsState>({
    sma: { enabled: true, period: 20, color: '#3A86FF' },
    ema: { enabled: false, period: 50, color: '#FFBE0B' },
    bb: { enabled: false, period: 20, color: '#00F5D4' },
    rsi: { enabled: true, period: 14, color: '#9D4EDD' }
  });
  
  // AI States
  const [signal, setSignal] = useState<ExplainableTradeSignalsOutput | undefined>();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sync with Firestore when logged in
  useEffect(() => {
    if (user) {
      getUserPreferences(user.uid).then(prefs => {
        if (prefs) {
          if (prefs.activePair) setActivePair(prefs.activePair);
          if (prefs.activeTimeframe) setActiveTimeframe(prefs.activeTimeframe);
          if (prefs.indicators) setIndicators(prefs.indicators);
        }
      });
    }
  }, [user]);

  // Persist changes to Firestore
  useEffect(() => {
    if (user) {
      saveUserPreferences(user.uid, {
        activePair,
        activeTimeframe,
        indicators
      });
    }
  }, [user, activePair, activeTimeframe, indicators]);

  const loadMarketData = async () => {
    const apiKey = localStorage.getItem('finnhub_api_key');
    if (!apiKey) {
      const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
      setData(mockData);
      setIsRealData(false);
      return;
    }

    setIsLoadingData(true);
    try {
      const symbol = mapSymbolToFinnhub(activePair);
      const res = mapTimeframeToResolution(activeTimeframe);
      const realData = await fetchFinnhubCandles(symbol, res, apiKey);
      
      if (realData && realData.length > 0) {
        setData(realData);
        setIsRealData(true);
      } else {
        const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
        setData(mockData);
        setIsRealData(false);
      }
    } catch (error) {
      const mockData = generateMockForexData(activePair === 'USDJPY' ? 149.20 : 1.0820, 150);
      setData(mockData);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const apiKey = localStorage.getItem('finnhub_api_key');
    if (!apiKey || !isRealData) return;

    const symbol = mapSymbolToFinnhub(activePair);
    const socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketConnected(true);
      socket.send(JSON.stringify({ type: 'subscribe', symbol }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'trade') {
        const lastTrade = msg.data[msg.data.length - 1];
        const newPrice = lastTrade.p;
        setData(prev => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const candle = updated[updated.length - 1];
          candle.close = newPrice;
          candle.high = Math.max(candle.high, newPrice);
          candle.low = Math.min(candle.low, newPrice);
          return updated;
        });
      }
    };

    socket.onclose = () => setSocketConnected(false);
    socket.onerror = () => setSocketConnected(false);

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [activePair, isRealData]);

  useEffect(() => {
    loadMarketData();
  }, [activePair, activeTimeframe]);

  const runAnalysis = async () => {
    if (data.length < 50) {
      toast({
        title: "Insufficient Data",
        description: "AI analysis requires at least 50 candles.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const recentCandles = data.slice(-100); 
      const localPatterns = detectPatterns(recentCandles);
      const patternNames = Array.from(new Set(localPatterns.map(p => p.text)));

      const result = await getExplainableTradeSignals({
        currencyPair: activePair,
        timeframe: activeTimeframe,
        candles: recentCandles.map(c => ({
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          timestamp: Number(c.time) * 1000
        })),
        indicators: {
          rsi: 62.5, 
          sma: recentCandles[recentCandles.length - 1].close * 0.998,
        },
        detectedPatterns: patternNames
      });
      setSignal(result);

      const patternResult = await detectCandlestickPatterns({
        candles: data.slice(-20).map(c => ({
          ...c,
          time: new Date(Number(c.time) * 1000).toISOString()
        })),
        marketContext: `Market behavior on ${activePair} ${activeTimeframe}`
      });
      setPatterns(patternResult.patterns);

    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not complete AI analysis.",
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
      {showWatchlist && (
        <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-sidebar/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", showWatchlist ? "text-primary" : "text-muted-foreground")}
              onClick={() => setShowWatchlist(!showWatchlist)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="h-4 w-px bg-border/50" />

            <div className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors">
              <span className="text-sm font-bold tracking-tight">{activePair}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
            </div>
            
            <div className="h-4 w-px bg-border/50" />

            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe} className="h-8">
              <TabsList className="bg-transparent h-8 p-0 gap-1 overflow-x-auto max-w-[300px] flex-nowrap scrollbar-none">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger 
                    key={tf} value={tf} 
                    className="h-7 px-2.5 text-[10px] font-bold border-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded shrink-0"
                  >
                    {tf}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1.5 ml-2">
              <Badge variant={isRealData ? "default" : "secondary"} className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider">
                {isRealData ? "Live" : "Demo"}
              </Badge>
              {isRealData && (
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase",
                  socketConnected ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                )}>
                  {socketConnected ? <Wifi className="w-2 h-2" /> : <WifiOff className="w-2 h-2" />}
                  {socketConnected ? "Connected" : "Disconnected"}
                </div>
              )}
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
              </div>
            </TooltipProvider>

            <div className="h-4 w-px bg-border/50 mx-2" />

            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing || isLoadingData}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-[10px] uppercase tracking-wider px-4 shadow-lg shadow-primary/20"
            >
              <Zap className={cn("w-3.5 h-3.5 mr-1.5", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analysing" : "AI Analysis"}
            </Button>
            
            <div className="h-4 w-px bg-border/50 mx-2" />

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", showIndicatorSettings ? "text-primary" : "text-muted-foreground")}
              onClick={() => {
                setShowIndicatorSettings(!showIndicatorSettings);
                if (!showIndicatorSettings) setShowAnalysisPanel(false);
              }}
            >
              <Settings2 className="w-4 h-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", showAnalysisPanel ? "text-primary" : "text-muted-foreground")}
              onClick={() => {
                setShowAnalysisPanel(!showAnalysisPanel);
                if (!showAnalysisPanel) setShowIndicatorSettings(false);
              }}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-border/50 mx-2" />
            
            <UserNav />
          </div>
        </header>

        <div className="flex-1 relative bg-[#0B0E11] overflow-hidden">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Data...</span>
              </div>
            </div>
          )}

          <div className="h-full w-full">
            <TradingChart ref={chartRef} data={data} indicators={indicators} />
          </div>
        </div>

        <footer className="h-10 border-t bg-sidebar/80 backdrop-blur-md flex items-center justify-between px-4 text-[9px] font-bold text-muted-foreground uppercase tracking-wider overflow-hidden">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={cn("w-1.5 h-1.5 rounded-full", isRealData ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
              <span>{isRealData ? "Finnhub Live" : "Demo Engine"}</span>
            </div>
            <div className="h-3 w-px bg-border/50 shrink-0" />
            <div className="flex items-center gap-2 text-destructive/80 italic overflow-hidden">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="truncate">Disclaimer: AI signals are rule-based approximations and do not constitute financial advice.</span>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono ml-4 shrink-0">
            <span>UTC: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>
        </footer>
      </main>

      {showIndicatorSettings && (
        <IndicatorSettingsSidebar 
          indicators={indicators} 
          setIndicators={setIndicators} 
          onClose={() => setShowIndicatorSettings(false)} 
        />
      )}

      {showAnalysisPanel && (
        <AnalysisPanel signal={signal} patterns={patterns} isLoading={isAnalyzing} />
      )}
    </div>
  );
}

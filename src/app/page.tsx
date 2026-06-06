
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WatchlistSidebar } from '@/components/watchlist-sidebar';
import { TradingChart, TradingChartHandle } from '@/components/trading-chart';
import { AnalysisPanel } from '@/components/analysis-panel';
import { IndicatorSettingsSidebar, IndicatorsState } from '@/components/indicator-settings-sidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  Zap, 
  PanelLeft,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  generateMockForexData, 
  Candlestick, 
  detectPatterns, 
  mapSymbolToFinnhub, 
  mapTimeframeToResolution, 
  calculateRSI, 
  calculateSMA, 
  calculateEMA, 
  calculateMACD,
  getMockBasePrice 
} from '@/lib/forex-data-utils';
import { getExplainableTradeSignals, ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { detectCandlestickPatterns } from '@/ai/flows/candlestick-pattern-recognition';
import { generateAnalysisAudio } from '@/ai/flows/analysis-tts';
import { fetchFinnhubCandles } from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', 'D', 'W', 'M'];

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [activePair, setActivePair] = useState('XAUUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [customAiInstructions, setCustomAiInstructions] = useState('');
  const [data, setData] = useState<Candlestick[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const chartRef = useRef<TradingChartHandle>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);

  const [indicators, setIndicators] = useState<IndicatorsState>({
    sma: { enabled: true, period: 20, color: '#3A86FF' },
    ema: { enabled: false, period: 50, color: '#FFBE0B' },
    bb: { enabled: false, period: 20, color: '#00F5D4' },
    rsi: { enabled: true, period: 14, color: '#9D4EDD' },
    macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
    volume: { enabled: true },
    showPatternLabels: true
  });
  
  const [signal, setSignal] = useState<ExplainableTradeSignalsOutput & { analyzedCandleCount?: number; audioUri?: string } | undefined>();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [signalHistory, setSignalHistory] = useState<any[]>([]);

  // Load signal history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('fx_signal_history');
    if (savedHistory) {
      try {
        setSignalHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse signal history');
      }
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setShowWatchlist(false);
      setShowAnalysisPanel(false);
    }
  }, [isMobile]);

  const loadMarketData = async () => {
    const apiKey = localStorage.getItem('finnhub_api_key');
    if (!apiKey) {
      const mockData = generateMockForexData(getMockBasePrice(activePair), 150);
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
        setData(generateMockForexData(getMockBasePrice(activePair), 150));
        setIsRealData(false);
      }
    } catch (error) {
      setData(generateMockForexData(getMockBasePrice(activePair), 150));
      setIsRealData(false);
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

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const finnSymbol = mapSymbolToFinnhub(activePair);
        socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: finnSymbol }));
        socketRef.current.close();
      }
    };
  }, [activePair, isRealData]);

  useEffect(() => {
    loadMarketData();
  }, [activePair, activeTimeframe]);

  const runAnalysis = async () => {
    let recentCandles = chartRef.current?.getVisibleData() || [];
    if (recentCandles.length < 10) recentCandles = data.slice(-100);

    if (recentCandles.length < 10) {
      toast({ title: "Insufficient Data", description: "Zoom out to select more data.", variant: "destructive" });
      return;
    }
    
    setIsAnalyzing(true);
    if (isMobile) setShowAnalysisPanel(true);

    try {
      const localPatterns = detectPatterns(recentCandles);
      const patternNames = Array.from(new Set(localPatterns.map(p => p.text)));

      const currentRsi = calculateRSI(recentCandles, indicators.rsi.period).slice(-1)[0]?.value;
      const currentSma = calculateSMA(recentCandles, indicators.sma.period).slice(-1)[0]?.value;
      const currentEma = calculateEMA(recentCandles, indicators.ema.period).slice(-1)[0]?.value;
      const currentMacd = calculateMACD(recentCandles);
      
      const macdInput = currentMacd.line.length > 0 ? {
        line: currentMacd.line.slice(-1)[0].value,
        signal: currentMacd.signal.slice(-1)[0].value,
        histogram: currentMacd.histogram.slice(-1)[0].value,
      } : undefined;

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
          rsi: currentRsi,
          sma: currentSma,
          ema: currentEma,
          macd: macdInput
        },
        detectedPatterns: patternNames,
        customInstructions: customAiInstructions
      });
      
      const newSignal = { ...result, analyzedCandleCount: recentCandles.length, timestamp: Date.now(), pair: activePair };
      setSignal(newSignal);

      // Add to session history
      const updatedHistory = [newSignal, ...signalHistory.slice(0, 9)];
      setSignalHistory(updatedHistory);
      localStorage.setItem('fx_signal_history', JSON.stringify(updatedHistory));

      // Fetch patterns
      const patternResult = await detectCandlestickPatterns({
        candles: recentCandles.slice(-30).map(c => ({
          ...c,
          time: new Date(Number(c.time) * 1000).toISOString()
        })),
        marketContext: `Market: ${activePair} ${activeTimeframe}`
      });
      setPatterns(patternResult.patterns);

      // Trigger TTS generation automatically
      try {
        setIsGeneratingAudio(true);
        const audioResult = await generateAnalysisAudio({ text: result.reasoning });
        setSignal(prev => prev ? { ...prev, audioUri: audioResult.audioDataUri } : undefined);
      } catch (err) {
        console.error('TTS failed', err);
      } finally {
        setIsGeneratingAudio(false);
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Analysis Failed", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSignalFromHistory = (histSignal: any) => {
    setSignal(histSignal);
    setActivePair(histSignal.pair);
    setShowAnalysisPanel(true);
    if (isMobile) setShowWatchlist(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30 relative">
      {isMobile && (showWatchlist || showAnalysisPanel || showIndicatorSettings) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30" onClick={() => { setShowWatchlist(false); setShowAnalysisPanel(false); setShowIndicatorSettings(false); }} />
      )}

      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 left-0 shadow-2xl" : "relative border-r shrink-0", showWatchlist ? "translate-x-0 w-72" : "-translate-x-full w-0")}>
        {showWatchlist && <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} onClose={() => setShowWatchlist(false)} />}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-sidebar/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", showWatchlist && "text-primary")} onClick={() => setShowWatchlist(!showWatchlist)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold tracking-tight">{activePair}</span>
            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe}>
              <TabsList className="bg-transparent h-8 gap-1 hidden sm:flex">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger key={tf} value={tf} className="h-7 px-2 text-[10px] font-bold border-none data-[state=active]:bg-primary/10 rounded">{tf}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-1.5">
            <Button onClick={runAnalysis} disabled={isAnalyzing || isLoadingData} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20">
              <Zap className={cn("w-3.5 h-3.5 mr-1.5", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analysing" : "AI Analysis"}
            </Button>
            <div className="h-4 w-px bg-border/50 mx-2" />
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", showIndicatorSettings && "text-primary")} onClick={() => { setShowIndicatorSettings(!showIndicatorSettings); setShowAnalysisPanel(false); }}>
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", showAnalysisPanel && "text-primary")} onClick={() => { setShowAnalysisPanel(!showAnalysisPanel); setShowIndicatorSettings(false); }}>
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 relative bg-[#0B0E11]">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Market Data...</span>
            </div>
          )}
          <TradingChart 
            ref={chartRef} 
            data={data} 
            indicators={indicators} 
            signal={signal} 
            symbol={activePair}
            timeframe={activeTimeframe}
          />
        </div>

        <footer className="h-10 border-t bg-sidebar/80 flex items-center justify-between px-4 text-[9px] font-bold text-muted-foreground uppercase tracking-wider italic">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", isRealData ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
            {isRealData ? "Finnhub Live Connection" : "Demo Simulation Mode"}
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-destructive/80" />
            <span>Risk Disclosure: AI signals are probabilistic approximations. Past performance ≠ future results.</span>
          </div>
        </footer>
      </main>

      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 right-0 shadow-2xl" : "relative border-l", (showIndicatorSettings || showAnalysisPanel) ? "translate-x-0 w-80" : "translate-x-full w-0")}>
        {showIndicatorSettings && <IndicatorSettingsSidebar indicators={indicators} setIndicators={setIndicators} customAiInstructions={customAiInstructions} setCustomAiInstructions={setCustomAiInstructions} onClose={() => setShowIndicatorSettings(false)} />}
        {showAnalysisPanel && (
          <AnalysisPanel 
            signal={signal} 
            patterns={patterns} 
            history={signalHistory}
            isLoading={isAnalyzing} 
            isGeneratingAudio={isGeneratingAudio}
            onSelectFromHistory={loadSignalFromHistory}
            onClose={() => setShowAnalysisPanel(false)} 
          />
        )}
      </aside>
    </div>
  );
}

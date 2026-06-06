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
  Globe,
  Newspaper
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
  getMockBasePrice,
  fetchMarketNews
} from '@/lib/forex-data-utils';
import { getExplainableTradeSignals } from '@/ai/flows/explainable-trade-signals';
import { detectCandlestickPatterns } from '@/ai/flows/candlestick-pattern-recognition';
import { generateAnalysisAudio } from '@/ai/flows/analysis-tts';
import { fetchFinnhubCandles } from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', 'D'];

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [activePair, setActivePair] = useState('XAUUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [customAiInstructions, setCustomAiInstructions] = useState('');
  const [data, setData] = useState<Candlestick[]>([]);
  const [news, setNews] = useState<any[]>([]);
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
  
  const [signal, setSignal] = useState<any>();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [signalHistory, setSignalHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('fx_session_history');
    if (savedHistory) setSignalHistory(JSON.parse(savedHistory));
    
    const apiKey = localStorage.getItem('finnhub_api_key') || '';
    fetchMarketNews(apiKey).then(setNews);
  }, []);

  const loadMarketData = async () => {
    const apiKey = localStorage.getItem('finnhub_api_key');
    setIsLoadingData(true);
    try {
      const symbol = mapSymbolToFinnhub(activePair);
      const res = mapTimeframeToResolution(activeTimeframe);
      const realData = apiKey ? await fetchFinnhubCandles(symbol, res, apiKey) : null;
      if (realData && realData.length > 0) {
        setData(realData); setIsRealData(true);
      } else {
        setData(generateMockForexData(getMockBasePrice(activePair), 150)); setIsRealData(false);
      }
    } catch (error) {
      setData(generateMockForexData(getMockBasePrice(activePair), 150));
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => { loadMarketData(); }, [activePair, activeTimeframe]);

  const runAnalysis = async () => {
    let recentCandles = chartRef.current?.getVisibleData() || [];
    if (recentCandles.length < 10) recentCandles = data.slice(-100);
    if (recentCandles.length < 10) return;
    
    setIsAnalyzing(true);
    if (isMobile) setShowAnalysisPanel(true);

    try {
      const apiKey = localStorage.getItem('finnhub_api_key') || '';
      const symbol = mapSymbolToFinnhub(activePair);
      
      // Multi-timeframe fetch
      const dailyData = apiKey ? await fetchFinnhubCandles(symbol, 'D', apiKey) : generateMockForexData(getMockBasePrice(activePair), 50);
      const dailyTrend = dailyData && dailyData.length > 1 ? (dailyData[dailyData.length-1].close > dailyData[dailyData.length-2].close ? 'Bullish' : 'Bearish') : 'Neutral';

      const localPatterns = detectPatterns(recentCandles);
      const patternNames = Array.from(new Set(localPatterns.map(p => p.text)));
      const currentRsi = calculateRSI(recentCandles, indicators.rsi.period).slice(-1)[0]?.value;
      const currentMacd = calculateMACD(recentCandles);

      const result = await getExplainableTradeSignals({
        currencyPair: activePair,
        timeframe: activeTimeframe,
        candles: recentCandles.slice(-100).map(c => ({
          open: c.open, high: c.high, low: c.low, close: c.close, timestamp: Number(c.time) * 1000
        })),
        correlationData: { dailyTrend, summary: `Market is primarily ${dailyTrend} on the Daily chart.` },
        newsContext: news.slice(0, 3).map(n => n.headline),
        indicators: {
          rsi: currentRsi,
          macd: currentMacd.line.length > 0 ? {
            line: currentMacd.line.slice(-1)[0].value,
            signal: currentMacd.signal.slice(-1)[0].value,
            histogram: currentMacd.histogram.slice(-1)[0].value,
          } : undefined
        },
        detectedPatterns: patternNames,
        customInstructions: customAiInstructions
      });
      
      const newSignal = { ...result, timestamp: Date.now(), pair: activePair, timeframe: activeTimeframe };
      setSignal(newSignal);
      const updatedHistory = [newSignal, ...signalHistory].slice(0, 20);
      setSignalHistory(updatedHistory);
      localStorage.setItem('fx_session_history', JSON.stringify(updatedHistory));

      setIsGeneratingAudio(true);
      const audioResult = await generateAnalysisAudio({ text: result.reasoning });
      setSignal(prev => prev ? { ...prev, audioUri: audioResult.audioDataUri } : undefined);
    } catch (error) {
      toast({ title: "Analysis Failed", variant: "destructive" });
    } finally {
      setIsAnalyzing(false); setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 left-0" : "relative border-r", showWatchlist ? "w-72" : "w-0 overflow-hidden")}>
        <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} onClose={() => setShowWatchlist(false)} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowWatchlist(!showWatchlist)}><PanelLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold">{activePair}</span>
            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe}>
              <TabsList className="bg-transparent h-8 gap-1 hidden sm:flex">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger key={tf} value={tf} className="h-7 px-2 text-[10px] font-bold">{tf}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={runAnalysis} disabled={isAnalyzing} className="h-8 text-[10px] font-bold uppercase bg-primary">
              <Zap className={cn("w-3.5 h-3.5 mr-1.5", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analyzing" : "AI Multi-TF Analysis"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowIndicatorSettings(!showIndicatorSettings)}><Settings2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}><MessageSquare className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 relative bg-[#0B0E11]">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Syncing Data...</span>
            </div>
          )}
          <TradingChart ref={chartRef} data={data} indicators={indicators} signal={signal} symbol={activePair} timeframe={activeTimeframe} />
        </div>

        <footer className="h-8 border-t bg-card/50 flex items-center justify-between px-4 text-[9px] font-bold text-muted-foreground uppercase">
          <div className="flex items-center gap-2"><div className={cn("w-1.5 h-1.5 rounded-full", isRealData ? "bg-green-500" : "bg-blue-500")} /> {isRealData ? "Live" : "Demo"}</div>
          <div className="flex items-center gap-4">
             {news.length > 0 && <div className="flex items-center gap-2"><Newspaper className="w-3 h-3" /> <span className="truncate max-w-[300px]">{news[0].headline}</span></div>}
             <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-destructive" /> <span>Risk Warning</span></div>
          </div>
        </footer>
      </main>

      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 right-0 shadow-2xl" : "relative border-l", (showIndicatorSettings || showAnalysisPanel) ? "w-80" : "w-0 overflow-hidden")}>
        {showIndicatorSettings && <IndicatorSettingsSidebar indicators={indicators} setIndicators={setIndicators} customAiInstructions={customAiInstructions} setCustomAiInstructions={setCustomAiInstructions} onClose={() => setShowIndicatorSettings(false)} />}
        {showAnalysisPanel && <AnalysisPanel signal={signal} patterns={patterns} history={signalHistory} isLoading={isAnalyzing} isGeneratingAudio={isGeneratingAudio} onSelectFromHistory={(sig) => { setSignal(sig); setActivePair(sig.pair); setActiveTimeframe(sig.timeframe); }} onClose={() => setShowAnalysisPanel(false)} />}
      </aside>
    </div>
  );
}

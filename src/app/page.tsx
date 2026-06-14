
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WatchlistSidebar } from '@/components/watchlist-sidebar';
import { TradingChart, TradingChartHandle } from '@/components/trading-chart';
import { AnalysisPanel } from '@/components/analysis-panel';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  Zap, 
  PanelLeft,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Newspaper,
  Calculator,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  generateMockForexData, 
  Candlestick, 
  detectPatterns, 
  mapSymbolToYahoo, 
  mapSymbolToFinnhub,
  mapSymbolToAlphaVantage,
  mapTimeframeToYahooInterval, 
  calculateRSI, 
  calculateMACD,
  calculateEMA,
  getMockBasePrice,
  fetchMarketNews,
  fetchEconomicCalendar
} from '@/lib/forex-data-utils';
import { getExplainableTradeSignals } from '@/ai/flows/explainable-trade-signals';
import { generateAnalysisAudio } from '@/ai/flows/analysis-tts';
import { fetchYahooCandles, fetchFinnhubCandles, fetchAlphaVantageCandles } from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', 'D'];

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);
  const [activePair, setActivePair] = useState('EURUSD');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [marketProvider, setMarketProvider] = useState<'yahoo' | 'finnhub' | 'alphavantage'>('yahoo');
  const [customAiInstructions, setCustomAiInstructions] = useState('');
  const [data, setData] = useState<Candlestick[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const chartRef = useRef<TradingChartHandle>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState('analysis');

  const [indicators, setIndicators] = useState<IndicatorsState>({
    sma: { enabled: true, period: 20, color: '#3A86FF' },
    ema: { enabled: false, period: 50, color: '#FFBE0B' },
    bb: { enabled: false, period: 20, color: '#00F5D4' },
    rsi: { enabled: true, period: 14, color: '#9D4EDD' },
    macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
    volume: { enabled: true },
    showPatternLabels: true,
    chartType: 'candlestick'
  });
  
  const [signal, setSignal] = useState<any>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [signalHistory, setSignalHistory] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const savedHistory = localStorage.getItem('fx_session_history');
    if (savedHistory) setSignalHistory(JSON.parse(savedHistory));
    
    const savedProvider = localStorage.getItem('market_provider');
    if (savedProvider) setMarketProvider(savedProvider as any);

    fetchMarketNews().then(setNews);
    fetchEconomicCalendar().then(setCalendar);
  }, []);

  const loadMarketData = async () => {
    setIsLoadingData(true);
    try {
      let result: Candlestick[] | null = null;
      
      if (marketProvider === 'yahoo') {
        result = await fetchYahooCandles(mapSymbolToYahoo(activePair), mapTimeframeToYahooInterval(activeTimeframe));
      } else if (marketProvider === 'finnhub') {
        const key = localStorage.getItem('finnhub_api_key');
        if (key) result = await fetchFinnhubCandles(mapSymbolToFinnhub(activePair), activeTimeframe === 'D' ? 'D' : '60', key);
      } else if (marketProvider === 'alphavantage') {
        const key = localStorage.getItem('alphavantage_api_key');
        const symbols = mapSymbolToAlphaVantage(activePair);
        if (key) result = await fetchAlphaVantageCandles(symbols.from, symbols.to, key);
      }
      
      if (result && result.length > 0) {
        setData(result); 
        setIsRealData(true);
      } else {
        setData(generateMockForexData(getMockBasePrice(activePair), 150)); 
        setIsRealData(false);
        if (marketProvider !== 'yahoo') {
          toast({ title: "API Note", description: `Falling back to simulation. Check your ${marketProvider} key.`, variant: "default" });
        }
      }
    } catch (error) {
      console.error('Market fetch error:', error);
      setData(generateMockForexData(getMockBasePrice(activePair), 150));
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => { 
    if (isMounted) loadMarketData(); 
  }, [activePair, activeTimeframe, marketProvider, isMounted]);

  // WebSocket for Finnhub Real-time
  useEffect(() => {
    if (marketProvider !== 'finnhub') {
      if (socketRef.current) socketRef.current.close();
      return;
    }

    const key = localStorage.getItem('finnhub_api_key');
    if (!key) return;

    const socket = new WebSocket(`wss://ws.finnhub.io?token=${key}`);
    socketRef.current = socket;

    socket.onopen = () => {
      const symbol = mapSymbolToFinnhub(activePair);
      socket.send(JSON.stringify({ type: 'subscribe', symbol }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'trade') {
        const lastTrade = msg.data[0];
        setData(prev => {
          if (prev.length === 0) return prev;
          const lastCandle = { ...prev[prev.length - 1] };
          lastCandle.close = lastTrade.p;
          lastCandle.high = Math.max(lastCandle.high, lastTrade.p);
          lastCandle.low = Math.min(lastCandle.low, lastTrade.p);
          return [...prev.slice(0, -1), lastCandle];
        });
      }
    };

    return () => socket.close();
  }, [marketProvider, activePair]);

  // Yahoo Polling Fallback
  useEffect(() => {
    if (marketProvider !== 'yahoo' || !isRealData) return;
    const interval = setInterval(async () => {
      const yahooData = await fetchYahooCandles(mapSymbolToYahoo(activePair), mapTimeframeToYahooInterval(activeTimeframe));
      if (yahooData && yahooData.length > 0) {
        setData(prev => {
          const lastPrev = prev[prev.length - 1];
          const lastNew = yahooData[yahooData.length - 1];
          return lastNew.time === lastPrev.time ? [...prev.slice(0, -1), lastNew] : [...prev, lastNew].slice(-500);
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [marketProvider, isRealData, activePair, activeTimeframe]);

  const runAnalysis = async () => {
    let recentCandles = chartRef.current?.getVisibleData() || [];
    if (recentCandles.length < 10) recentCandles = data.slice(-100);
    if (recentCandles.length < 10) return;
    
    setIsAnalyzing(true);
    setActivePanelTab('analysis');
    setShowSidePanel(true);

    try {
      const symbol = mapSymbolToYahoo(activePair);
      const dailyData = await fetchYahooCandles(symbol, '1d');
      let dailyTrend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
      if (dailyData && dailyData.length >= 20) {
        const ema20 = calculateEMA(dailyData, 20);
        dailyTrend = dailyData[dailyData.length - 1].close > ema20[ema20.length - 1].value ? 'Bullish' : 'Bearish';
      }

      const localPatterns = detectPatterns(recentCandles);
      const patternNames = Array.from(new Set(localPatterns.map(p => p.text)));
      const rsiResults = calculateRSI(recentCandles, indicators.rsi.period);
      const currentRsi = rsiResults.length > 0 ? rsiResults[rsiResults.length - 1].value : null;
      
      const macdResults = calculateMACD(recentCandles);
      const currentMacd = macdResults.line.length > 0 ? {
        line: macdResults.line[macdResults.line.length - 1].value,
        signal: macdResults.signal[macdResults.signal.length - 1].value,
        histogram: macdResults.histogram[macdResults.histogram.length - 1].value,
      } : undefined;

      const result = await getExplainableTradeSignals({
        currencyPair: activePair,
        timeframe: activeTimeframe,
        candles: recentCandles.slice(-100).map(c => ({
          open: c.open, high: c.high, low: c.low, close: c.close, timestamp: Number(c.time) * 1000
        })),
        correlationData: { dailyTrend, summary: `Institutional Context: The Daily ${dailyTrend} trend provides major confluence.` },
        newsContext: news.slice(0, 3).map(n => n.headline),
        indicators: { rsi: currentRsi, macd: currentMacd },
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
      console.error('Analysis error:', error);
      toast({ title: "Analysis Failed", description: "AI could not complete analysis.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false); setIsGeneratingAudio(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 left-0" : "relative border-r", showWatchlist ? "w-72" : "w-0 overflow-hidden")}>
        <WatchlistSidebar activePair={activePair} onSelectPair={setActivePair} onClose={() => setShowWatchlist(false)} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowWatchlist(!showWatchlist)}><PanelLeft className="h-4 w-4" /></Button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none">{activePair}</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">{marketProvider} Hub</span>
            </div>
            <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe}>
              <TabsList className="bg-transparent h-8 gap-1 hidden sm:flex">
                {TIMEFRAMES.map(tf => (
                  <TabsTrigger key={tf} value={tf} className="h-7 px-2 text-[10px] font-bold">{tf}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={runAnalysis} disabled={isAnalyzing} className="h-8 text-[10px] font-bold uppercase bg-primary hover:bg-primary/90">
              <Zap className={cn("w-3.5 h-3.5 mr-1.5", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "Analyzing" : "AI Multi-TF Analysis"}
            </Button>
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", activePanelTab === 'indicators' && showSidePanel && "bg-accent")} onClick={() => togglePanel('indicators')}><Settings2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", activePanelTab === 'tools' && showSidePanel && "bg-accent")} onClick={() => togglePanel('tools')}><Calculator className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", activePanelTab === 'calendar' && showSidePanel && "bg-accent")} onClick={() => togglePanel('calendar')}><CalendarIcon className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", activePanelTab === 'analysis' && showSidePanel && "bg-accent")} onClick={() => togglePanel('analysis')}><MessageSquare className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 relative bg-[#0B0E11]">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fetching {marketProvider} Data...</span>
            </div>
          )}
          <TradingChart ref={chartRef} data={data} indicators={indicators} signal={signal} symbol={activePair} timeframe={activeTimeframe} />
        </div>

        <footer className="h-8 border-t bg-card/50 flex items-center justify-between px-4 text-[9px] font-bold text-muted-foreground uppercase">
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", isRealData ? "bg-green-500" : "bg-blue-500")} /> 
            {isRealData ? `${marketProvider} Live` : "Simulator Mode"}
          </div>
          <div className="flex items-center gap-4">
             {news.length > 0 && <div className="flex items-center gap-2 hidden lg:flex text-primary"><Newspaper className="w-3 h-3" /> <span className="truncate max-w-[300px]">{news[0].headline}</span></div>}
             <div className="flex items-center gap-1.5 text-destructive/80"><AlertTriangle className="w-3 h-3" /> <span>High Risk Disclosure</span></div>
          </div>
        </footer>
      </main>

      <aside className={cn("z-40 transition-all duration-300", isMobile ? "fixed inset-y-0 right-0 shadow-2xl" : "relative border-l", showSidePanel ? "w-80" : "w-0 overflow-hidden")}>
        <AnalysisPanel 
          signal={signal} 
          history={signalHistory} 
          calendar={calendar} 
          isLoading={isAnalyzing} 
          isGeneratingAudio={isGeneratingAudio} 
          onSelectFromHistory={(sig) => { setSignal(sig); setActivePair(sig.pair); setActiveTimeframe(sig.timeframe); }} 
          onClose={() => setShowSidePanel(false)} 
          activeTab={activePanelTab}
          onTabChange={setActivePanelTab}
          indicators={indicators}
          setIndicators={setIndicators}
          customAiInstructions={customAiInstructions}
          setCustomAiInstructions={setCustomAiInstructions}
          marketProvider={marketProvider}
          setMarketProvider={setMarketProvider}
        />
      </aside>
    </div>
  );
}

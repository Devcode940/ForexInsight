'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Calendar as CalendarIcon,
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
  calculateSMA,
  getMockBasePrice,
  fetchMarketNews,
  fetchEconomicCalendar,
} from '@/lib/forex-data-utils';
import {
  getExplainableTradeSignals,
  ExplainableTradeSignalsOutput,
} from '@/ai/flows/explainable-trade-signals';
import { generateAnalysisAudio } from '@/ai/flows/analysis-tts';
import {
  fetchYahooCandles,
  fetchFinnhubCandles,
  fetchAlphaVantageCandles,
} from '@/app/actions/market-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/config';
import {
  getUserPreferences,
  saveUserPreferences,
  saveTradeSignal,
  getSignalHistory,
} from '@/lib/supabase/store';
import {
  MARKET_DATA,
  AI_ANALYSIS,
  WEBSOCKET,
  UI,
  STORAGE_KEYS,
  INDICATORS,
} from '@/lib/constants';
import { isFeatureEnabled } from '@/lib/feature-flags';

// --- Constants ---
const POLLING_INTERVAL_MS = MARKET_DATA.POLLING_INTERVAL_MS;
const MAX_HISTORY_ITEMS = AI_ANALYSIS.MAX_HISTORY_ITEMS;
const ANALYSIS_COOLDOWN_MS = AI_ANALYSIS.COOLDOWN_MS;
const WEBSOCKET_RECONNECT_DELAY_MS = WEBSOCKET.INITIAL_RECONNECT_DELAY_MS;
const MAX_CANDLES_MEMORY = MARKET_DATA.MAX_CANDLES_MEMORY;

// --- Types ---
type MarketProvider = 'yahoo' | 'finnhub' | 'alphavantage';
type Timeframe = (typeof UI.TIMEFRAMES)[number];

interface TradeSignal extends ExplainableTradeSignalsOutput {
  timestamp: number;
  pair: string;
  timeframe: string;
  audioUri?: string;
}

interface NewsItem {
  headline: string;
  datetime: number;
}

interface CalendarEvent {
  country: string;
  event: string;
  impact: string;
  time: string;
  prev: string;
  estimate: string;
}

// --- Helpers ---
function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Dashboard:${context}] ${message}`, {
    name: error instanceof Error ? error.name : undefined,
  });
}

// --- Component ---
export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();

  // Mount guard to prevent SSR hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Market state
  const [activePair, setActivePair] = useState<string>(UI.DEFAULT_PAIR);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>(UI.DEFAULT_TIMEFRAME);
  const [marketProvider, setMarketProvider] = useState<MarketProvider>('yahoo');
  const [customAiInstructions, setCustomAiInstructions] = useState<string>('');
  const [data, setData] = useState<Candlestick[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // UI state
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState<string>('analysis');

  // Indicator configuration
  const [indicators, setIndicators] = useState<IndicatorsState>({
    sma: { enabled: true, period: INDICATORS.SMA.period, color: INDICATORS.SMA.color },
    ema: { enabled: false, period: INDICATORS.EMA.period, color: INDICATORS.EMA.color },
    rsi: { enabled: true, period: INDICATORS.RSI.period, color: INDICATORS.RSI.color },
    macd: { enabled: false, fast: INDICATORS.MACD.fast, slow: INDICATORS.MACD.slow, signal: INDICATORS.MACD.signal },
    volume: { enabled: true },
    showPatternLabels: true,
    chartType: 'candlestick',
  });

  // AI analysis state
  const [signal, setSignal] = useState<TradeSignal | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [signalHistory, setSignalHistory] = useState<TradeSignal[]>([]);
  const lastAnalysisRef = useRef<number>(0);

  // Initial load guard to prevent redundant DB writes
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs
  const chartRef = useRef<TradingChartHandle>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // --- Toggle panel helper (was missing, causing runtime errors) ---
  const togglePanel = useCallback((tab: string) => {
    setShowSidePanel(true);
    setActivePanelTab(tab);
  }, []);

  // --- Mount: load persisted state and static data ---
  useEffect(() => {
    setIsMounted(true);

    // Load from localStorage first (fast, for unauthenticated users)
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as TradeSignal[];
        if (Array.isArray(parsed)) setSignalHistory(parsed);
      }

      const savedProvider = localStorage.getItem(STORAGE_KEYS.MARKET_PROVIDER);
      if (savedProvider === 'yahoo' || savedProvider === 'finnhub' || savedProvider === 'alphavantage') {
        setMarketProvider(savedProvider);
      }
    } catch (e) {
      logError('localStorageLoad', e);
    }

    // Fire-and-forget with error handling
    fetchMarketNews()
      .then(setNews)
      .catch((e) => logError('fetchMarketNews', e));

    fetchEconomicCalendar()
      .then(setCalendar)
      .catch((e) => logError('fetchEconomicCalendar', e));

    return () => setIsMounted(false);
  }, []);

  // --- Load authenticated user preferences from DB ---
  useEffect(() => {
    if (!user) {
      setIsInitialLoad(false);
      return;
    }

    setIsInitialLoad(true);

    getUserPreferences(user.id)
      .then((prefs) => {
        if (prefs) {
          if (prefs.activePair) setActivePair(prefs.activePair);
          if (prefs.activeTimeframe) setActiveTimeframe(prefs.activeTimeframe as Timeframe);
          if (prefs.indicators) setIndicators(prefs.indicators);
          if (prefs.customAiInstructions) setCustomAiInstructions(prefs.customAiInstructions);
        }
        // Also load signal history from DB
        return getSignalHistory(user.id);
      })
      .then((dbHistory) => {
        if (dbHistory && dbHistory.length > 0) {
          const mapped: TradeSignal[] = dbHistory.map((s) => ({
            ...s,
            pair: s.currencyPair,
            timeframe: s.timeframe,
            timestamp: s.createdAt,
          }));
          setSignalHistory(mapped);
        }
      })
      .catch((e) => logError('loadUserPreferences', e))
      .finally(() => {
        // Small delay to ensure state updates settle before allowing saves
        setTimeout(() => setIsInitialLoad(false), 150);
      });
  }, [user]);

  // --- Persist user preferences (skip during initial load) ---
  useEffect(() => {
    if (!user || isInitialLoad) return;

    saveUserPreferences(user.id, {
      activePair,
      activeTimeframe,
      indicators,
      customAiInstructions,
    }).catch((e) => logError('saveUserPreferences', e));
  }, [user, isInitialLoad, activePair, activeTimeframe, indicators, customAiInstructions]);

  // --- Load market data ---
  const loadMarketData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      let result: Candlestick[] | null = null;

      if (marketProvider === 'yahoo') {
        result = await fetchYahooCandles(
          mapSymbolToYahoo(activePair),
          mapTimeframeToYahooInterval(activeTimeframe)
        );
      } else if (marketProvider === 'finnhub') {
        result = await fetchFinnhubCandles(
          mapSymbolToFinnhub(activePair),
          activeTimeframe === 'D' ? 'D' : '60',
          user?.id
        );
      } else if (marketProvider === 'alphavantage') {
        const symbols = mapSymbolToAlphaVantage(activePair);
        result = await fetchAlphaVantageCandles(
          symbols.from,
          symbols.to,
          '60min',
          user?.id
        );
      }

      if (result && result.length > 0) {
        setData(result);
        setIsRealData(true);
      } else {
        setData(generateMockForexData(getMockBasePrice(activePair), MARKET_DATA.MOCK_CANDLE_COUNT));
        setIsRealData(false);
        if (marketProvider !== 'yahoo') {
          toast({
            title: 'API Note',
            description: `Falling back to simulation. Check your ${marketProvider} configuration.`,
            variant: 'default',
          });
        }
      }
    } catch (error) {
      logError('loadMarketData', error);
      setData(generateMockForexData(getMockBasePrice(activePair), 150));
      setIsRealData(false);
    } finally {
      setIsLoadingData(false);
    }
  }, [marketProvider, activePair, activeTimeframe, user?.id, toast]);

  // Trigger data load when market inputs change
  useEffect(() => {
    if (isMounted) {
      loadMarketData();
    }
  }, [isMounted, loadMarketData]);

  // --- WebSocket for Finnhub real-time ---
  useEffect(() => {
    if (marketProvider !== 'finnhub' || !isFeatureEnabled('WEBSOCKET_ENABLED')) {
      if (socketRef.current) {
        try {
          if (socketRef.current.readyState === WebSocket.OPEN) {
            const symbol = mapSymbolToFinnhub(activePair);
            socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          }
          socketRef.current.close();
        } catch (e) {
          logError('websocketCleanup', e);
        }
        socketRef.current = null;
      }
      return;
    }

    // Get API key — try user DB first, then env
    let apiKey: string | undefined;
    const loadKeyAndConnect = async () => {
      if (user && supabase) {
        const { data } = await supabase
          .from('user_preferences')
          .select('finnhub_api_key')
          .eq('user_id', user.id)
          .single();
        apiKey = data?.finnhub_api_key;
      }
      if (!apiKey) {
        apiKey =
          (process.env as any).FINNHUB_API_KEY ||
          (process.env as any).NEXT_PUBLIC_FINNHUB_API_KEY;
      }
      if (!apiKey) return;

      const connect = () => {
        try {
          const socket = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
          socketRef.current = socket;

          socket.onopen = () => {
            reconnectAttemptsRef.current = 0;
            const symbol = mapSymbolToFinnhub(activePair);
            socket.send(JSON.stringify({ type: 'subscribe', symbol }));
          };

          socket.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'trade' && Array.isArray(msg.data) && msg.data.length > 0) {
                const lastTrade = msg.data[0];
                setData((prev) => {
                  if (prev.length === 0) return prev;
                  const lastCandle = { ...prev[prev.length - 1] };
                  lastCandle.close = lastTrade.p;
                  lastCandle.high = Math.max(lastCandle.high, lastTrade.p);
                  lastCandle.low = Math.min(lastCandle.low, lastTrade.p);
                  return [...prev.slice(0, -1), lastCandle];
                });
              }
            } catch (e) {
              logError('websocketMessageParse', e);
            }
          };

          socket.onerror = (e) => {
            logError('websocketError', new Error('WebSocket connection error'));
          };

          socket.onclose = () => {
            // Exponential backoff reconnection
            reconnectAttemptsRef.current++;
            const delay = Math.min(
              WEBSOCKET_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1),
              WEBSOCKET.MAX_RECONNECT_DELAY_MS
            );
            setTimeout(connect, delay);
          };
        } catch (e) {
          logError('websocketConnect', e);
        }
      };

      connect();
    };

    loadKeyAndConnect();

    return () => {
      if (socketRef.current) {
        try {
          if (socketRef.current.readyState === WebSocket.OPEN) {
            const symbol = mapSymbolToFinnhub(activePair);
            socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          }
          socketRef.current.close();
        } catch (e) {
          logError('websocketCleanup', e);
        }
        socketRef.current = null;
      }
    };
  }, [marketProvider, activePair, user]);

  // --- Yahoo polling fallback ---
  useEffect(() => {
    if (marketProvider !== 'yahoo' || !isRealData) return;

    const interval = setInterval(async () => {
      try {
        const yahooData = await fetchYahooCandles(
          mapSymbolToYahoo(activePair),
          mapTimeframeToYahooInterval(activeTimeframe)
        );
        if (yahooData && yahooData.length > 0) {
          setData((prev) => {
            if (prev.length === 0) return yahooData;
            const lastPrev = prev[prev.length - 1];
            const lastNew = yahooData[yahooData.length - 1];
            return lastNew.time === lastPrev.time
              ? [...prev.slice(0, -1), lastNew]
              : [...prev, lastNew].slice(-MAX_CANDLES_MEMORY);
          });
        }
      } catch (e) {
        logError('yahooPolling', e);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [marketProvider, isRealData, activePair, activeTimeframe]);

  // --- Run AI Analysis ---
  const runAnalysis = useCallback(async () => {
    // Feature flag check
    if (!isFeatureEnabled('AI_ANALYSIS_ENABLED')) {
      toast({
        title: 'Feature disabled',
        description: 'AI analysis is currently unavailable.',
        variant: 'default',
      });
      return;
    }

    // Cooldown to prevent spamming
    const now = Date.now();
    if (now - lastAnalysisRef.current < ANALYSIS_COOLDOWN_MS) {
      toast({
        title: 'Please wait',
        description: 'Analysis is rate-limited. Try again shortly.',
        variant: 'default',
      });
      return;
    }
    lastAnalysisRef.current = now;

    let recentCandles = chartRef.current?.getVisibleData() || [];
    if (recentCandles.length < AI_ANALYSIS.MIN_CANDLES_REQUIRED) recentCandles = data.slice(-100);
    if (recentCandles.length < AI_ANALYSIS.MIN_CANDLES_REQUIRED) {
      toast({
        title: 'Insufficient data',
        description: 'Not enough candle data to run analysis.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setActivePanelTab('analysis');
    setShowSidePanel(true);

    try {
      // --- Calculate ACTUAL indicator values (not hardcoded placeholders) ---
      const symbol = mapSymbolToYahoo(activePair);
      const dailyData = await fetchYahooCandles(symbol, '1d');

      let dailyTrend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
      if (dailyData && dailyData.length >= 20) {
        const ema20 = calculateEMA(dailyData, 20);
        if (ema20.length > 0) {
          dailyTrend =
            dailyData[dailyData.length - 1].close > ema20[ema20.length - 1].value
              ? 'Bullish'
              : 'Bearish';
        }
      }

      const localPatterns = detectPatterns(recentCandles);
      const patternNames = Array.from(new Set(localPatterns.map((p) => p.text)));

      const rsiResults = calculateRSI(recentCandles, indicators.rsi.period);
      const currentRsi = rsiResults.length > 0 ? rsiResults[rsiResults.length - 1].value : null;

      const smaResults = indicators.sma.enabled
        ? calculateSMA(recentCandles, indicators.sma.period)
        : [];
      const currentSma = smaResults.length > 0 ? smaResults[smaResults.length - 1].value : null;

      const emaResults = indicators.ema.enabled
        ? calculateEMA(recentCandles, indicators.ema.period)
        : [];
      const currentEma = emaResults.length > 0 ? emaResults[emaResults.length - 1].value : null;

      const macdResults = calculateMACD(recentCandles);
      const currentMacd =
        macdResults.line.length > 0 && macdResults.signal.length > 0 && macdResults.histogram.length > 0
          ? {
              line: macdResults.line[macdResults.line.length - 1].value,
              signal: macdResults.signal[macdResults.signal.length - 1].value,
              histogram: macdResults.histogram[macdResults.histogram.length - 1].value,
            }
          : undefined;

      const result = await getExplainableTradeSignals({
        currencyPair: activePair,
        timeframe: activeTimeframe,
        candles: recentCandles.slice(-AI_ANALYSIS.MAX_CANDLES_FOR_LLM).map((c) => ({
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          timestamp: Number(c.time) * 1000,
        })),
        correlationData: {
          dailyTrend,
          summary: `Institutional Context: The Daily ${dailyTrend} trend provides major confluence.`,
        },
        newsContext: news.slice(0, 3).map((n) => n.headline),
        indicators: {
          rsi: currentRsi,
          sma: currentSma,
          ema: currentEma,
          macd: currentMacd,
        },
        detectedPatterns: patternNames,
        customInstructions: customAiInstructions || undefined,
      });

      const newSignal: TradeSignal = {
        ...result,
        timestamp: Date.now(),
        pair: activePair,
        timeframe: activeTimeframe,
      };

      setSignal(newSignal);

      // Persist history
      const updatedHistory = [newSignal, ...signalHistory].slice(0, MAX_HISTORY_ITEMS);
      setSignalHistory(updatedHistory);

      try {
        localStorage.setItem(STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(updatedHistory));
      } catch (e) {
        logError('localStorageSave', e);
      }

      if (user) {
        saveTradeSignal(user.id, result, activePair, activeTimeframe).catch((e) =>
          logError('saveTradeSignal', e)
        );
      }

      // Generate audio (non-blocking, update signal when ready)
      setIsGeneratingAudio(true);
      try {
        const audioResult = await generateAnalysisAudio({ text: result.reasoning });
        setSignal((prev) =>
          prev ? { ...prev, audioUri: audioResult.audioDataUri } : undefined
        );
      } catch (e) {
        logError('generateAudio', e);
        // Don't fail the whole analysis if audio generation fails
      }
    } catch (error) {
      logError('runAnalysis', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Could not complete AI analysis.';
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingAudio(false);
    }
  }, [
    data,
    activePair,
    activeTimeframe,
    indicators,
    news,
    customAiInstructions,
    signalHistory,
    user,
    toast,
  ]);

  // --- Graceful shutdown: clean up resources on page unload ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Close WebSocket
      if (socketRef.current) {
        try {
          if (socketRef.current.readyState === WebSocket.OPEN) {
            const symbol = mapSymbolToFinnhub(activePair);
            socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          }
          socketRef.current.close();
        } catch (e) {
          // Best-effort cleanup during unload — ignore errors
        }
        socketRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activePair]);

  // --- Render ---
  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <aside
        className={cn(
          'z-40 transition-all duration-300',
          isMobile ? 'fixed inset-y-0 left-0' : 'relative border-r',
          showWatchlist ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        <WatchlistSidebar
          activePair={activePair}
          onSelectPair={setActivePair}
          onClose={() => setShowWatchlist(false)}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowWatchlist(!showWatchlist)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none">{activePair}</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                {marketProvider} Hub
              </span>
            </div>
            <Tabs value={activeTimeframe} onValueChange={(v) => setActiveTimeframe(v as Timeframe)}>
              <TabsList className="bg-transparent h-8 gap-1 hidden sm:flex">
                {UI.TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf}
                    value={tf}
                    className="h-7 px-2 text-[10px] font-bold"
                  >
                    {tf}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-1.5">
            {isFeatureEnabled('AI_ANALYSIS_ENABLED') && (
              <Button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="h-8 text-[10px] font-bold uppercase bg-primary hover:bg-primary/90"
              >
                <Zap
                  className={cn('w-3.5 h-3.5 mr-1.5', isAnalyzing && 'animate-pulse')}
                />
                {isAnalyzing ? 'Analyzing' : 'AI Multi-TF Analysis'}
              </Button>
            )}
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                activePanelTab === 'indicators' && showSidePanel && 'bg-accent'
              )}
              onClick={() => togglePanel('indicators')}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                activePanelTab === 'tools' && showSidePanel && 'bg-accent'
              )}
              onClick={() => togglePanel('tools')}
            >
              <Calculator className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                activePanelTab === 'calendar' && showSidePanel && 'bg-accent'
              )}
              onClick={() => togglePanel('calendar')}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                activePanelTab === 'analysis' && showSidePanel && 'bg-accent'
              )}
              onClick={() => togglePanel('analysis')}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 relative bg-[#0B0E11]">
          {isLoadingData && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Fetching {marketProvider} Data...
              </span>
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

        <footer className="h-8 border-t bg-card/50 flex items-center justify-between px-4 text-[9px] font-bold text-muted-foreground uppercase">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isRealData ? 'bg-green-500' : 'bg-blue-500'
              )}
            />
            {isRealData ? `${marketProvider} Live` : 'Simulator Mode'}
          </div>
          <div className="flex items-center gap-4">
            {news.length > 0 && (
              <div className="flex items-center gap-2 hidden lg:flex text-primary">
                <Newspaper className="w-3 h-3" />
                <span className="truncate max-w-[300px]">{news[0].headline}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-destructive/80">
              <AlertTriangle className="w-3 h-3" />
              <span>High Risk Disclosure</span>
            </div>
          </div>
        </footer>
      </main>

      <aside
        className={cn(
          'z-40 transition-all duration-300',
          isMobile ? 'fixed inset-y-0 right-0 shadow-2xl' : 'relative border-l',
          showSidePanel ? 'w-80' : 'w-0 overflow-hidden'
        )}
      >
        <AnalysisPanel
          signal={signal}
          history={signalHistory}
          calendar={calendar}
          isLoading={isAnalyzing}
          isGeneratingAudio={isGeneratingAudio}
          onSelectFromHistory={(sig) => {
            setSignal(sig);
            setActivePair(sig.pair);
            setActiveTimeframe(sig.timeframe as Timeframe);
          }}
          onClose={() => setShowSidePanel(false)}
          activeTab={activePanelTab}
          onTabChange={setActivePanelTab}
          indicators={indicators}
          setIndicators={setIndicators}
          customAiInstructions={customAiInstructions}
          setCustomAiInstructions={setCustomAiInstructions}
          marketProvider={marketProvider}
          setMarketProvider={(val) => {
            setMarketProvider(val);
            try {
              localStorage.setItem(STORAGE_KEYS.MARKET_PROVIDER, val);
            } catch (e) {
              logError('localStorageSave', e);
            }
          }}
        />
      </aside>
    </div>
  );
}

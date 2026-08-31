'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  BrainCircuit,
  X,
  Volume2,
  VolumeX,
  ArrowRightCircle,
  Info,
  Calculator,
  Key,
  Globe,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculatePositionSize } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { useToast } from '@/hooks/use-toast';
import { saveUserApiKeys } from '@/app/actions/user-settings';
import { STORAGE_KEYS } from '@/lib/constants';

// --- Types ---
type TradeDirection = 'Bullish' | 'Bearish' | 'Neutral';
type MarketProvider = 'yahoo' | 'finnhub' | 'alphavantage';

export interface TradeSignal extends ExplainableTradeSignalsOutput {
  timestamp: number;
  pair: string;
  timeframe: string;
  audioUri?: string;
}

export interface CalendarEvent {
  country: string;
  event: string;
  impact: string;
  time: string;
  prev: string;
  estimate: string;
}

interface AnalysisPanelProps {
  signal?: TradeSignal;
  patterns?: Array<{ time: string | number; text: string; color: string }>;
  history?: TradeSignal[];
  calendar?: CalendarEvent[];
  isLoading?: boolean;
  isGeneratingAudio?: boolean;
  onSelectFromHistory?: (signal: TradeSignal) => void;
  onClose?: () => void;
  indicators: IndicatorsState;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorsState>>;
  customAiInstructions: string;
  setCustomAiInstructions: (val: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  marketProvider: MarketProvider;
  setMarketProvider: (val: MarketProvider) => void;
  /** Optional authenticated user ID for server-side key persistence */
  userId?: string;
}

// --- Helpers ---
type IndicatorKey = keyof IndicatorsState;

function isObjectValue(value: IndicatorsState[IndicatorKey]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- Component ---
export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  signal,
  history = [],
  isLoading,
  onSelectFromHistory,
  onClose,
  indicators,
  setIndicators,
  activeTab = 'analysis',
  onTabChange,
  marketProvider,
  setMarketProvider,
  userId,
}) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [finnhubKey, setFinnhubKey] = useState('');
  const [avKey, setAvKey] = useState('');

  // Calculator state
  const [calcBalance, setCalcBalance] = useState('10000');
  const [calcRisk, setCalcRisk] = useState('1');
  const [calcSL, setCalcSL] = useState('30');
  const [lotSize, setLotSize] = useState(0.33);

  // --- Load keys from localStorage (transitional; will move to server) ---
  useEffect(() => {
    try {
      setFinnhubKey(localStorage.getItem(STORAGE_KEYS.FINNHUB_KEY) || '');
      setAvKey(localStorage.getItem(STORAGE_KEYS.ALPHAVANTAGE_KEY) || '');
    } catch (e) {
      console.warn('[AnalysisPanel] localStorage unavailable', e);
    }
  }, []);

  // --- Position size calculator ---
  useEffect(() => {
    const balance = parseFloat(calcBalance) || 0;
    const risk = parseFloat(calcRisk) || 0;
    const slPips = parseFloat(calcSL) || 0;
    const isJpy = signal?.pair?.includes('JPY') ?? false;
    const res = calculatePositionSize(balance, risk, slPips, isJpy);
    setLotSize(res);
  }, [calcBalance, calcRisk, calcSL, signal?.pair]);

  // --- Audio lifecycle: pause + revoke on unmount or signal change ---
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        try {
          audio.pause();
          audio.src = '';
          audio.removeAttribute('src');
          audio.load();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      setIsPlaying(false);
    };
  }, [signal?.audioUri]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((e) => {
        console.error('[AnalysisPanel] Audio playback failed:', e);
        toast({
          title: 'Audio unavailable',
          description: 'Browser blocked autoplay. Try clicking again.',
          variant: 'default',
        });
      });
    }
  };

  const saveKeys = async () => {
    // If user is authenticated, save securely to server
    if (userId) {
      try {
        const result = await saveUserApiKeys(userId, {
          finnhubApiKey: finnhubKey || undefined,
          alphavantageApiKey: avKey || undefined,
        });

        if (result.success) {
          try {
            localStorage.setItem(STORAGE_KEYS.MARKET_PROVIDER, marketProvider);
          } catch (e) {
            // Non-critical
          }
          toast({
            title: 'Saved securely',
            description: result.message,
            variant: 'default',
          });
          window.location.reload();
        } else {
          toast({
            title: 'Save failed',
            description: result.message,
            variant: 'destructive',
          });
        }
        return;
      } catch (e) {
        toast({
          title: 'Save failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
    }

    // Fallback: unauthenticated — localStorage only (with warning)
    try {
      if (finnhubKey) localStorage.setItem(STORAGE_KEYS.FINNHUB_KEY, finnhubKey);
      if (avKey) localStorage.setItem(STORAGE_KEYS.ALPHAVANTAGE_KEY, avKey);
      localStorage.setItem(STORAGE_KEYS.MARKET_PROVIDER, marketProvider);
      toast({
        title: 'Saved locally',
        description: 'Sign in for secure server-side key storage.',
        variant: 'default',
      });
      window.location.reload();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: 'Could not write to browser storage.',
        variant: 'destructive',
      });
    }
  };

  const updateIndicator = <K extends IndicatorKey>(
    key: K,
    updates: Partial<IndicatorsState[K]> | IndicatorsState[K]
  ) => {
    setIndicators((prev) => {
      const current = prev[key];
      if (isObjectValue(current) && isObjectValue(updates as Record<string, unknown>)) {
        return {
          ...prev,
          [key]: { ...current, ...(updates as Record<string, unknown>) },
        };
      }
      return { ...prev, [key]: updates as IndicatorsState[K] };
    });
  };

  // --- Sub-components ---
  const SentimentGauge = ({
    confidence,
    direction,
  }: {
    confidence: number;
    direction: TradeDirection | string;
  }) => {
    const safeConfidence = Math.max(1, Math.min(10, Number(confidence) || 5));
    const rotation = (safeConfidence / 10) * 180 - 90;
    const color =
      direction === 'Bullish'
        ? 'text-green-500'
        : direction === 'Bearish'
        ? 'text-red-500'
        : 'text-yellow-500';

    return (
      <div className="p-4 rounded-xl border bg-muted/5 flex flex-col items-center justify-center relative overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] w-0.5 h-8 bg-primary rounded-full origin-bottom transition-transform duration-1000"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Market Sentiment
        </span>
        <span className={cn('text-lg font-bold mt-6', color)}>
          {direction} {safeConfidence}/10
        </span>
      </div>
    );
  };

  return (
    <div className="w-full h-full border-l bg-card flex flex-col overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-tight">Trading Hub</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-4 mt-4 h-8 bg-muted/30">
          <TabsTrigger value="analysis" className="flex-1 text-[9px] font-bold uppercase">
            Report
          </TabsTrigger>
          <TabsTrigger value="indicators" className="flex-1 text-[9px] font-bold uppercase">
            Setup
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex-1 text-[9px] font-bold uppercase">
            Tools
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-[9px] font-bold uppercase">
            Replays
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* ===== ANALYSIS TAB ===== */}
          <TabsContent value="analysis" className="p-4 space-y-6 m-0 outline-none">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-32 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            ) : signal ? (
              <>
                <SentimentGauge confidence={signal.confidence} direction={signal.direction} />

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge
                      className={cn(
                        'font-bold',
                        signal.direction === 'Bullish'
                          ? 'bg-green-500'
                          : signal.direction === 'Bearish'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      )}
                    >
                      {signal.direction}
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {signal.pair}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">
                        Entry Zone
                      </span>
                      <span className="text-[11px] font-mono font-bold text-primary">
                        {signal.entryZone}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">
                        R:R Ratio
                      </span>
                      <span className="text-[11px] font-mono font-bold">
                        {signal.riskRewardRatio}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">
                        Stop Loss
                      </span>
                      <span className="text-[11px] font-mono font-bold text-red-500">
                        {signal.stopLoss}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">
                        Take Profit
                      </span>
                      <span className="text-[11px] font-mono font-bold text-green-500">
                        {signal.takeProfit}
                      </span>
                    </div>
                  </div>

                  {signal.confluenceFactors && signal.confluenceFactors.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">
                        Confluence
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {signal.confluenceFactors.slice(0, 5).map((factor, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-primary uppercase flex items-center gap-1.5">
                        <ArrowRightCircle className="w-3 h-3" /> Voice Analysis
                      </span>
                      {signal.audioUri && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-primary"
                          onClick={toggleAudio}
                        >
                          {isPlaying ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground/80 italic">
                      "{signal.reasoning}"
                    </p>
                    {signal.audioUri && (
                      <audio
                        ref={audioRef}
                        src={signal.audioUri}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                        preload="none"
                      />
                    )}
                  </div>

                  {signal.riskWarning && (
                    <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                      <p className="text-[9px] text-destructive/90 leading-relaxed">
                        {signal.riskWarning}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl mx-2">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-[11px] text-muted-foreground italic px-4">
                  Run AI Analysis to see insights.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ===== INDICATORS / SETUP TAB ===== */}
          <TabsContent value="indicators" className="p-4 space-y-8 m-0 outline-none">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Connectivity
                </h3>
              </div>
              <div className="p-4 rounded-xl bg-muted/10 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Preferred Source</Label>
                  <Select value={marketProvider} onValueChange={(v) => setMarketProvider(v as MarketProvider)}>
                    <SelectTrigger className="h-9 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yahoo">Yahoo Finance (Polling)</SelectItem>
                      <SelectItem value="finnhub">Finnhub (WebSocket)</SelectItem>
                      <SelectItem value="alphavantage">Alpha Vantage (REST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {marketProvider === 'finnhub' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Finnhub Key</Label>
                    <Input
                      type="password"
                      value={finnhubKey}
                      onChange={(e) => setFinnhubKey(e.target.value)}
                      className="h-8 text-xs bg-background"
                      autoComplete="off"
                    />
                  </div>
                )}

                {marketProvider === 'alphavantage' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Alpha Vantage Key</Label>
                    <Input
                      type="password"
                      value={avKey}
                      onChange={(e) => setAvKey(e.target.value)}
                      className="h-8 text-xs bg-background"
                      autoComplete="off"
                    />
                  </div>
                )}

                <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-[9px] text-yellow-600 dark:text-yellow-400/90 leading-relaxed">
                    Keys are stored in this browser only. For authenticated users, server-side
                    persistence will be used in a future release.
                  </p>
                </div>

                <Button size="sm" onClick={saveKeys} className="w-full h-8 font-bold text-[10px]">
                  SAVE & RELOAD
                </Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Technicals
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">SMA Overlay</Label>
                  <Switch
                    checked={indicators.sma.enabled}
                    onCheckedChange={(val) => updateIndicator('sma', { enabled: val })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">EMA Overlay</Label>
                  <Switch
                    checked={indicators.ema.enabled}
                    onCheckedChange={(val) => updateIndicator('ema', { enabled: val })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">RSI Oscillator</Label>
                  <Switch
                    checked={indicators.rsi.enabled}
                    onCheckedChange={(val) => updateIndicator('rsi', { enabled: val })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">MACD System</Label>
                  <Switch
                    checked={indicators.macd.enabled}
                    onCheckedChange={(val) => updateIndicator('macd', { enabled: val })}
                  />
                </div>
              </div>
            </section>
          </TabsContent>

          {/* ===== TOOLS TAB ===== */}
          <TabsContent value="tools" className="p-4 space-y-6 m-0 outline-none">
            <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-bold uppercase">Position Size</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Account Balance</Label>
                  <Input
                    value={calcBalance}
                    onChange={(e) => setCalcBalance(e.target.value)}
                    className="h-8 text-xs bg-background"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Risk %</Label>
                  <Input
                    value={calcRisk}
                    onChange={(e) => setCalcRisk(e.target.value)}
                    className="h-8 text-xs bg-background"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">SL Pips</Label>
                  <Input
                    value={calcSL}
                    onChange={(e) => setCalcSL(e.target.value)}
                    className="h-8 text-xs bg-background"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase">Standard Lots</span>
                <span className="text-xl font-bold text-accent">{lotSize.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>

          {/* ===== HISTORY TAB ===== */}
          <TabsContent value="history" className="p-4 space-y-4 m-0 outline-none">
            {history.length > 0 ? (
              history.map((hist, idx) => (
                <div
                  key={`${hist.timestamp}-${idx}`}
                  className="p-3 rounded-lg border bg-muted/10 hover:border-primary/50 cursor-pointer transition-all group"
                  onClick={() => onSelectFromHistory?.(hist)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase">
                      {hist.pair} • {hist.timeframe}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[8px]',
                        hist.direction === 'Bullish'
                          ? 'border-green-500 text-green-500'
                          : hist.direction === 'Bearish'
                          ? 'border-red-500 text-red-500'
                          : 'border-yellow-500 text-yellow-500'
                      )}
                    >
                      {hist.direction}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-2 italic">
                    "{hist.reasoning}"
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-20 uppercase tracking-widest">
                No history yet
              </p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

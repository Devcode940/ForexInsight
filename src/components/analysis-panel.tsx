
'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Target, 
  ArrowRightCircle,
  X,
  Volume2,
  VolumeX,
  Clock,
  Gauge,
  Info,
  Calculator,
  Calendar as CalendarIcon,
  Flag,
  History as HistoryIcon,
  Play,
  Activity,
  Waves,
  LineChart as LineChartIcon,
  BarChart3,
  CandlestickChart,
  Type,
  Key,
  Globe,
  RotateCcw,
  TrendingUp,
  Settings
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculatePositionSize } from '@/lib/forex-data-utils';
import { IndicatorsState } from '@/components/indicator-settings-sidebar';

interface AnalysisPanelProps {
  signal?: any;
  patterns?: any[];
  history?: any[];
  calendar?: any[];
  isLoading?: boolean;
  isGeneratingAudio?: boolean;
  onSelectFromHistory?: (signal: any) => void;
  onClose?: () => void;
  indicators: IndicatorsState;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorsState>>;
  customAiInstructions: string;
  setCustomAiInstructions: (val: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  marketProvider: 'yahoo' | 'finnhub' | 'alphavantage';
  setMarketProvider: (val: 'yahoo' | 'finnhub' | 'alphavantage') => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  signal, 
  history = [],
  calendar = [],
  isLoading, 
  isGeneratingAudio,
  onSelectFromHistory,
  onClose,
  indicators,
  setIndicators,
  customAiInstructions,
  setCustomAiInstructions,
  activeTab = 'analysis',
  onTabChange,
  marketProvider,
  setMarketProvider
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  const [finnhubKey, setFinnhubKey] = useState('');
  const [avKey, setAvKey] = useState('');

  // Calculator State
  const [calcBalance, setCalcBalance] = useState('10000');
  const [calcRisk, setCalcRisk] = useState('1');
  const [calcSL, setCalcSL] = useState('30');
  const [lotSize, setLotSize] = useState(0.33);

  useEffect(() => {
    setFinnhubKey(localStorage.getItem('finnhub_api_key') || '');
    setAvKey(localStorage.getItem('alphavantage_api_key') || '');
  }, []);

  useEffect(() => {
    const res = calculatePositionSize(
      parseFloat(calcBalance) || 0,
      parseFloat(calcRisk) || 0,
      parseFloat(calcSL) || 0,
      signal?.pair?.includes('JPY') || false
    );
    setLotSize(res);
  }, [calcBalance, calcRisk, calcSL, signal]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const saveKeys = () => {
    localStorage.setItem('finnhub_api_key', finnhubKey);
    localStorage.setItem('alphavantage_api_key', avKey);
    localStorage.setItem('market_provider', marketProvider);
    window.location.reload();
  };

  const updateIndicator = (key: keyof IndicatorsState, updates: any) => {
    setIndicators(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'object' ? { ...prev[key], ...updates } : updates
    }));
  };

  const SentimentGauge = ({ confidence, direction }: { confidence: number, direction: string }) => {
    const rotation = (confidence / 10) * 180 - 90;
    const color = direction === 'Bullish' ? 'text-green-500' : direction === 'Bearish' ? 'text-red-500' : 'text-yellow-500';
    return (
      <div className="p-4 rounded-xl border bg-muted/5 flex flex-col items-center justify-center relative overflow-hidden">
        <Gauge className={cn("w-12 h-12 mb-2 opacity-20", color)} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] w-0.5 h-8 bg-primary rounded-full origin-bottom transition-transform duration-1000" 
             style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Market Sentiment</span>
        <span className={cn("text-lg font-bold mt-1", color)}>{direction} {confidence}/10</span>
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
        {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="w-4 h-4" /></Button>}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 h-8 bg-muted/30">
          <TabsTrigger value="analysis" className="flex-1 text-[9px] font-bold uppercase">Report</TabsTrigger>
          <TabsTrigger value="indicators" className="flex-1 text-[9px] font-bold uppercase">Setup</TabsTrigger>
          <TabsTrigger value="tools" className="flex-1 text-[9px] font-bold uppercase">Tools</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-[9px] font-bold uppercase">Replays</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
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
                    <Badge className={cn("font-bold", signal.direction === 'Bullish' ? "bg-green-500" : "bg-red-500")}>{signal.direction}</Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{signal.pair}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">Stop Loss</span>
                      <span className="text-[11px] font-mono font-bold text-red-500">{signal.stopLoss}</span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">Take Profit</span>
                      <span className="text-[11px] font-mono font-bold text-green-500">{signal.takeProfit}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-primary uppercase flex items-center gap-1.5"><ArrowRightCircle className="w-3 h-3" /> Voice Analysis</span>
                      {signal.audioUri && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={toggleAudio}>
                          {isPlaying ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground/80 italic">"{signal.reasoning}"</p>
                    {signal.audioUri && <audio ref={audioRef} src={signal.audioUri} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} className="hidden" />}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl mx-2">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-[11px] text-muted-foreground italic px-4">Run AI Analysis to see insights.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="indicators" className="p-4 space-y-8 m-0 outline-none">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Connectivity</h3>
              </div>
              <div className="p-4 rounded-xl bg-muted/10 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Preferred Source</Label>
                  <Select value={marketProvider} onValueChange={(val: any) => setMarketProvider(val)}>
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
                    <Input type="password" value={finnhubKey} onChange={(e) => setFinnhubKey(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                )}
                {marketProvider === 'alphavantage' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase">Alpha Vantage Key</Label>
                    <Input type="password" value={avKey} onChange={(e) => setAvKey(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                )}
                <Button size="sm" onClick={saveKeys} className="w-full h-8 font-bold text-[10px]">SAVE & RELOAD</Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Technicals</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">SMA Overlay</Label>
                  <Switch checked={indicators.sma.enabled} onCheckedChange={(val) => updateIndicator('sma', { enabled: val })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">EMA Overlay</Label>
                  <Switch checked={indicators.ema.enabled} onCheckedChange={(val) => updateIndicator('ema', { enabled: val })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">RSI Oscillator</Label>
                  <Switch checked={indicators.rsi.enabled} onCheckedChange={(val) => updateIndicator('rsi', { enabled: val })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">MACD System</Label>
                  <Switch checked={indicators.macd.enabled} onCheckedChange={(val) => updateIndicator('macd', { enabled: val })} />
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="tools" className="p-4 space-y-6 m-0 outline-none">
            <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-bold uppercase">Position Size</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">Risk %</Label>
                  <Input value={calcRisk} onChange={(e) => setCalcRisk(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase">SL Pips</Label>
                  <Input value={calcSL} onChange={(e) => setCalcSL(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase">Standard Lots</span>
                <span className="text-xl font-bold text-accent">{lotSize}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4 m-0 outline-none">
            {history.length > 0 ? history.map((hist, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/10 hover:border-primary/50 cursor-pointer transition-all group" onClick={() => onSelectFromHistory?.(hist)}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase">{hist.pair} • {hist.timeframe}</span>
                  <Badge variant="outline" className={cn("text-[8px]", hist.direction === 'Bullish' ? "border-green-500 text-green-500" : "border-red-500 text-red-500")}>{hist.direction}</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground line-clamp-2 italic">"{hist.reasoning}"</p>
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-20 uppercase tracking-widest">No history yet</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

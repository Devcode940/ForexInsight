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
  TrendingUp
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
  // Indicator Props
  indicators: IndicatorsState;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorsState>>;
  customAiInstructions: string;
  setCustomAiInstructions: (val: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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
  onTabChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [apiKey, setApiKey] = useState('');

  // Calculator State
  const [calcBalance, setCalcBalance] = useState('10000');
  const [calcRisk, setCalcRisk] = useState('1');
  const [calcSL, setCalcSL] = useState('30');
  const [lotSize, setLotSize] = useState(0.33);

  useEffect(() => {
    const saved = localStorage.getItem('finnhub_api_key');
    if (saved) setApiKey(saved);
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

  const saveKey = () => {
    localStorage.setItem('finnhub_api_key', apiKey);
    window.location.reload();
  };

  const updateIndicator = (key: keyof IndicatorsState, updates: any) => {
    setIndicators(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'object' ? { ...prev[key], ...updates } : updates
    }));
  };

  const handleReset = () => {
    const defaults: IndicatorsState = {
      sma: { enabled: true, period: 20, color: '#3A86FF' },
      ema: { enabled: false, period: 50, color: '#FFBE0B' },
      bb: { enabled: false, period: 20, color: '#00F5D4' },
      rsi: { enabled: true, period: 14, color: '#9D4EDD' },
      macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
      volume: { enabled: true },
      showPatternLabels: true,
      chartType: 'candlestick'
    };
    setIndicators(defaults);
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
          <TabsTrigger value="history" className="flex-1 text-[9px] font-bold uppercase gap-1.5">
            <HistoryIcon className="w-3 h-3" /> Replays
          </TabsTrigger>
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{signal.pair} • {signal.timeframe}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">Entry Zone</span>
                      <span className="text-[11px] font-mono font-bold">{signal.entryZone}</span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/50">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block">RR Ratio</span>
                      <span className="text-[11px] font-mono font-bold text-primary">{signal.riskRewardRatio}</span>
                    </div>
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
                      <span className="text-[9px] font-bold text-primary uppercase flex items-center gap-1.5"><ArrowRightCircle className="w-3 h-3" /> Voice Reasoning</span>
                      {signal.audioUri && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={toggleAudio}>
                          {isPlaying ? <VolumeX className="w-3 h-3 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground/80 italic">"{signal.reasoning}"</p>
                    {signal.audioUri && <audio ref={audioRef} src={signal.audioUri} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} className="hidden" />}
                  </div>

                  <div className="pt-2 border-t border-primary/10">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-1">MTF Correlation</span>
                    <p className="text-[10px] text-muted-foreground leading-tight italic">"{signal.correlationAnalysis}"</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl mx-2">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-[11px] text-muted-foreground italic px-4">Run AI analysis to generate institutional reports.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="indicators" className="p-4 space-y-8 m-0 outline-none">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chart Display</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-tighter">Series Style</Label>
                  <Tabs value={indicators.chartType} onValueChange={(val) => updateIndicator('chartType', val as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50">
                      <TabsTrigger value="candlestick" className="text-[10px] font-bold uppercase gap-2"><CandlestickChart className="w-3.5 h-3.5" /> Candle</TabsTrigger>
                      <TabsTrigger value="line" className="text-[10px] font-bold uppercase gap-2"><LineChartIcon className="w-3.5 h-3.5" /> Line</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="flex items-center justify-between py-2 px-1">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-accent" />
                    <Label className="text-[10px] font-bold uppercase tracking-tighter">Pattern Labels</Label>
                  </div>
                  <Switch checked={indicators.showPatternLabels} onCheckedChange={(val) => updateIndicator('showPatternLabels', val)} />
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overlays</h3>
              </div>

              {/* MACD */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <Label className="text-xs font-bold">MACD</Label>
                  </div>
                  <Switch checked={indicators.macd.enabled} onCheckedChange={(val) => updateIndicator('macd', { enabled: val })} />
                </div>
              </div>

              {/* SMA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4 text-blue-400" />
                    <Label className="text-xs font-bold">SMA</Label>
                  </div>
                  <Switch checked={indicators.sma.enabled} onCheckedChange={(val) => updateIndicator('sma', { enabled: val })} />
                </div>
                {indicators.sma.enabled && (
                  <div className="space-y-3 pl-6">
                    <Slider value={[indicators.sma.period]} min={5} max={200} step={1} onValueChange={([val]) => updateIndicator('sma', { period: val })} />
                    <span className="text-[10px] text-muted-foreground">Period: {indicators.sma.period}</span>
                  </div>
                )}
              </div>

              {/* EMA */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-yellow-400" />
                    <Label className="text-xs font-bold">EMA</Label>
                  </div>
                  <Switch checked={indicators.ema.enabled} onCheckedChange={(val) => updateIndicator('ema', { enabled: val })} />
                </div>
                {indicators.ema.enabled && (
                  <div className="space-y-3 pl-6">
                    <Slider value={[indicators.ema.period]} min={5} max={200} step={1} onValueChange={([val]) => updateIndicator('ema', { period: val })} />
                    <span className="text-[10px] text-muted-foreground">Period: {indicators.ema.period}</span>
                  </div>
                )}
              </div>

              {/* RSI */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <Label className="text-xs font-bold">RSI</Label>
                  </div>
                  <Switch checked={indicators.rsi.enabled} onCheckedChange={(val) => updateIndicator('rsi', { enabled: val })} />
                </div>
                {indicators.rsi.enabled && (
                  <div className="space-y-3 pl-6">
                    <Slider value={[indicators.rsi.period]} min={2} max={30} step={1} onValueChange={([val]) => updateIndicator('rsi', { period: val })} />
                    <span className="text-[10px] text-muted-foreground">Period: {indicators.rsi.period}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Connectivity</h3>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-tighter">Finnhub Token</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter token..." className="h-9 pl-9 text-xs bg-background" />
                    </div>
                    <Button size="sm" onClick={saveKey} className="h-9 font-bold uppercase text-[10px]">Save</Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-4">
              <Button variant="outline" className="w-full h-9 text-[10px] font-bold uppercase gap-2" onClick={handleReset}><RotateCcw className="w-3 h-3" /> Reset Defaults</Button>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="p-4 space-y-8 m-0 outline-none">
            <div className="p-4 rounded-xl border bg-muted/5 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Position Calculator</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase">Balance ($)</Label>
                  <Input value={calcBalance} onChange={(e) => setCalcBalance(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase">Risk (%)</Label>
                  <Input value={calcRisk} onChange={(e) => setCalcRisk(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase">SL Pips</Label>
                  <Input value={calcSL} onChange={(e) => setCalcSL(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
              </div>
              <div className="pt-4 border-t border-accent/10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Recommended Lots</span>
                  <span className="text-xl font-bold text-accent">{lotSize}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Economic Events</h3>
              </div>
              {calendar.length > 0 ? calendar.map((ev, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold uppercase">{ev.country}</span>
                    </div>
                    <Badge variant={ev.impact === 'high' ? 'destructive' : 'outline'} className="text-[8px] h-4 uppercase">{ev.impact}</Badge>
                  </div>
                  <p className="text-[10px] font-bold">{ev.event}</p>
                  <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                    <span>{new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-2">
                      <span>Prev: {ev.prev}</span>
                      <span className="text-foreground">Fcst: {ev.estimate}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-muted-foreground italic text-center py-10 uppercase tracking-widest">No major events</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4 m-0 outline-none">
            <div className="flex items-center gap-2 mb-2">
              <HistoryIcon className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Analysis History</h3>
            </div>
            {history.length > 0 ? history.map((hist, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/10 hover:border-primary/50 cursor-pointer transition-all group relative overflow-hidden" onClick={() => onSelectFromHistory?.(hist)}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight">{hist.pair} • {hist.timeframe}</span>
                  <Badge variant="outline" className={cn("text-[8px] h-4 px-1", hist.direction === 'Bullish' ? "border-green-500 text-green-500" : "border-red-500 text-red-500")}>{hist.direction}</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground line-clamp-2 italic">"{hist.reasoning}"</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground uppercase font-bold"><Clock className="w-2.5 h-2.5" /> {new Date(hist.timestamp).toLocaleTimeString()}</div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 text-primary fill-primary" />
                  </Button>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary transform translate-x-full group-hover:translate-x-0 transition-transform" />
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-20 uppercase tracking-widest">Session is empty</p>
            )}
          </TabsContent>
        </ScrollArea>

        {activeTab === 'indicators' && (
          <div className="p-4 bg-accent/5 border-t border-accent/10">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-accent" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Configuration</h3>
            </div>
            <Textarea 
              value={customAiInstructions}
              onChange={(e) => setCustomAiInstructions(e.target.value)}
              placeholder="e.g. Focus on scalping strategies..." 
              className="min-h-[80px] text-[10px] bg-background resize-none"
            />
          </div>
        )}
      </Tabs>
    </div>
  );
};

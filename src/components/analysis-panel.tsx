
'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Zap, 
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
  ChevronRight,
  History as HistoryIcon,
  Play
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculatePositionSize } from '@/lib/forex-data-utils';

interface AnalysisPanelProps {
  signal?: any;
  patterns?: any[];
  history?: any[];
  calendar?: any[];
  isLoading?: boolean;
  isGeneratingAudio?: boolean;
  onSelectFromHistory?: (signal: any) => void;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  signal, 
  history = [],
  calendar = [],
  isLoading, 
  isGeneratingAudio,
  onSelectFromHistory,
  onClose 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Calculator State
  const [calcBalance, setCalcBalance] = useState('10000');
  const [calcRisk, setCalcRisk] = useState('1');
  const [calcSL, setCalcSL] = useState('30');
  const [lotSize, setLotSize] = useState(0.33);

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
          <h2 className="text-sm font-bold uppercase tracking-tight">AI Analysis Station</h2>
        </div>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="w-4 h-4" /></Button>}
      </div>

      <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 h-8 bg-muted/30">
          <TabsTrigger value="analysis" className="flex-1 text-[9px] font-bold uppercase">Report</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-[9px] font-bold uppercase gap-1.5">
            <HistoryIcon className="w-3 h-3" /> Replays
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex-1 text-[9px] font-bold uppercase">Tools</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 text-[9px] font-bold uppercase">Events</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="analysis" className="p-4 space-y-6 m-0">
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
                <p className="text-[11px] text-muted-foreground italic px-4">Focus on price action and run analysis for institutional reports.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4 m-0">
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
              <p className="text-[10px] text-muted-foreground italic text-center py-20 uppercase tracking-widest">Session is currently empty</p>
            )}
          </TabsContent>

          <TabsContent value="tools" className="p-4 space-y-6 m-0">
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
          </TabsContent>

          <TabsContent value="calendar" className="p-4 space-y-4 m-0">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Economic Calendar</h3>
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
              <p className="text-[10px] text-muted-foreground italic text-center py-20 uppercase tracking-widest">No major high-impact events</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

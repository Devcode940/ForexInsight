
'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  ArrowRightCircle,
  Stethoscope,
  Scale,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  Clock,
  Gauge
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnalysisPanelProps {
  signal?: ExplainableTradeSignalsOutput & { analyzedCandleCount?: number; audioUri?: string; timestamp?: number; pair?: string };
  patterns?: any[];
  history?: any[];
  isLoading?: boolean;
  isGeneratingAudio?: boolean;
  onSelectFromHistory?: (signal: any) => void;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  signal, 
  patterns = [], 
  history = [],
  isLoading, 
  isGeneratingAudio,
  onSelectFromHistory,
  onClose 
}) => {
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const SignalCard = ({ sig }: { sig: any }) => {
    return (
      <div className={cn(
        "p-4 rounded-xl border border-border/50 shadow-sm",
        sig.direction === 'Bullish' ? "bg-green-500/5 border-green-500/20" : 
        sig.direction === 'Bearish' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
      )}>
        <div className="flex justify-between items-start mb-4">
          <Badge className={cn(
            "text-[10px] font-bold px-2 py-0.5",
            sig.direction === 'Bullish' ? "bg-green-500 text-white" : 
            sig.direction === 'Bearish' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {sig.direction.toUpperCase()}
          </Badge>
          <div className="text-right flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Confidence</span>
              <span className="text-sm font-mono font-bold text-primary">{sig.confidence}/10</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Target className="w-2.5 h-2.5" /> Entry
            </span>
            <p className="text-[10px] font-bold font-mono text-foreground mt-0.5">{sig.entryZone}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Scale className="w-2.5 h-2.5" /> RR Ratio
            </span>
            <p className="text-[10px] font-bold font-mono text-primary mt-0.5">{sig.riskRewardRatio}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">SL</span>
            <p className="text-[10px] font-bold font-mono text-red-400 mt-0.5">{sig.stopLoss}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">TP</span>
            <p className="text-[10px] font-bold font-mono text-green-400 mt-0.5">{sig.takeProfit}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-primary">
              <ArrowRightCircle className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Reasoning</span>
            </div>
            {sig.audioUri && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary hover:text-primary/80" 
                onClick={toggleAudio}
              >
                {isPlaying ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>
            )}
            {sig.audioUri && (
              <audio 
                ref={audioRef} 
                src={sig.audioUri} 
                onPlay={() => setIsPlaying(true)} 
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-foreground/80 font-medium italic">
            "{sig.reasoning}"
          </p>
        </div>
      </div>
    );
  };

  const SentimentGauge = ({ confidence, direction }: { confidence: number, direction: string }) => {
    const rotation = (confidence / 10) * 180 - 90;
    const colorClass = direction === 'Bullish' ? 'text-green-500' : direction === 'Bearish' ? 'text-red-500' : 'text-yellow-500';
    
    return (
      <div className="p-4 rounded-xl border bg-muted/5 flex flex-col items-center justify-center relative overflow-hidden">
        <Gauge className={cn("w-12 h-12 mb-2 opacity-20", colorClass)} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] w-0.5 h-8 bg-primary rounded-full origin-bottom transition-transform duration-1000" 
             style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Market Sentiment</span>
        <span className={cn("text-lg font-headline font-bold mt-1", colorClass)}>{direction}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full border-l bg-sidebar flex flex-col overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight uppercase">AI Confluence</h2>
        </div>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 bg-muted/20">
          <TabsTrigger value="analysis" className="flex-1 text-[10px] font-bold uppercase">Analysis</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-[10px] font-bold uppercase">History</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="analysis" className="p-4 space-y-6 m-0">
            <section>
              {signal && !isLoading && <SentimentGauge confidence={signal.confidence} direction={signal.direction} />}
              
              <div className="flex items-center justify-between mt-6 mb-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Signal</h3>
                </div>
                {signal?.analyzedCandleCount && (
                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{signal.analyzedCandleCount} candles</span>
                )}
              </div>
              
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-48 bg-muted/40 rounded-xl" />
                  <div className="h-24 bg-muted/40 rounded-xl" />
                </div>
              ) : signal ? (
                <div className="space-y-4">
                  <SignalCard sig={signal} />
                  {isGeneratingAudio && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                      <Volume2 className="w-3 h-3 text-primary animate-bounce" />
                      <span className="text-[9px] font-bold text-primary uppercase">Generating Voice Brief...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5">
                  <p className="text-[11px] text-muted-foreground px-4 italic">No active analysis. Use 'AI Analysis' to evaluate the current chart view.</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detected Patterns</h3>
              </div>
              <div className="space-y-2">
                {patterns.length > 0 ? (
                  patterns.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-xs font-bold">{p.patternName}</span>
                         <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">{p.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4">No candlestick patterns detected.</p>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-4 m-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Session Signals</h3>
            </div>
            {history.length > 0 ? (
              history.map((hist, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                    hist.direction === 'Bullish' ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"
                  )}
                  onClick={() => onSelectFromHistory?.(hist)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-tight">{hist.pair} • {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <Badge variant="outline" className="text-[8px] h-4 px-1">{hist.direction}</Badge>
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-2 italic">"{hist.reasoning}"</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-muted-foreground italic text-center py-8">No session history yet.</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

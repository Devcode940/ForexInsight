'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  AlertCircle, 
  Info,
  ShieldAlert,
  ArrowRightCircle,
  Stethoscope,
  Scale,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  X
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnalysisPanelProps {
  signal?: ExplainableTradeSignalsOutput;
  patterns?: any[];
  isLoading?: boolean;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ signal, patterns = [], isLoading, onClose }) => {
  const isMobile = useIsMobile();

  const activeSignal = signal;

  return (
    <div className="w-full h-full border-l bg-sidebar flex flex-col overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight uppercase">AI Confluence</h2>
        </div>
        <div className="flex gap-1 items-center">
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 ml-1">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">

            {/* Signal Header */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Trade Probability</h3>
              </div>
              
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-32 bg-muted/40 rounded-xl" />
                  <div className="h-24 bg-muted/40 rounded-xl" />
                </div>
              ) : activeSignal ? (
                <div className="space-y-4">
                  <div className={cn(
                    "p-4 rounded-xl border border-border/50 shadow-sm",
                    activeSignal.direction === 'Bullish' ? "bg-green-500/5 border-green-500/20" : 
                    activeSignal.direction === 'Bearish' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <Badge className={cn(
                        "text-[10px] font-bold px-2 py-0.5",
                        activeSignal.direction === 'Bullish' ? "bg-green-500 text-white" : 
                        activeSignal.direction === 'Bearish' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {activeSignal.direction.toUpperCase()}
                      </Badge>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Confidence</span>
                        <span className={cn(
                          "text-sm font-mono font-bold",
                          activeSignal.confidence > 7 ? "text-primary" : "text-muted-foreground"
                        )}>{activeSignal.confidence}/10</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 rounded bg-muted/20 border border-border/30">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Target className="w-2.5 h-2.5" /> Entry
                        </span>
                        <p className="text-[10px] font-bold font-mono text-foreground mt-0.5">{activeSignal.entryZone}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border/30">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Scale className="w-2.5 h-2.5" /> RR Ratio
                        </span>
                        <p className="text-[10px] font-bold font-mono text-primary mt-0.5">{activeSignal.riskRewardRatio}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border/30">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Stop Loss</span>
                        <p className="text-[10px] font-bold font-mono text-red-400 mt-0.5">{activeSignal.stopLoss}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-border/30">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Take Profit</span>
                        <p className="text-[10px] font-bold font-mono text-green-400 mt-0.5">{activeSignal.takeProfit}</p>
                      </div>
                    </div>

                    {activeSignal.confluenceFactors && activeSignal.confluenceFactors.length > 0 && (
                      <div className="mb-4">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Alignment Factors</span>
                        <div className="flex flex-wrap gap-1">
                          {activeSignal.confluenceFactors.map((f, i) => (
                            <div key={i} className="flex items-center gap-1 bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                              <CheckCircle2 className="w-2 h-2" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-primary">
                        <ArrowRightCircle className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Logic Analysis</span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/80 font-medium italic">
                        "{activeSignal.reasoning}"
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5">
                  <p className="text-xs text-muted-foreground px-4">Ready for deep analysis. Select an asset and timeframe to generate a high-confluence report.</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-accent" />
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rule-Based Patterns</h3>
                </div>
              </div>
              
              <div className="space-y-2">
                {patterns.length > 0 ? (
                  patterns.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/30 group hover:border-accent/50 transition-all cursor-default">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold">{p.patternName}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal group-hover:text-foreground transition-colors">{p.explanation}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center border border-dashed rounded-lg bg-muted/5 opacity-60">
                    <AlertCircle className="w-4 h-4 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground">Scanning for structural patterns...</p>
                  </div>
                )}
              </div>
            </section>
          </div>
      </ScrollArea>
    </div>
  );
};

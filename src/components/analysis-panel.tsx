'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Info,
  ShieldAlert,
  ArrowRightCircle,
  Stethoscope,
  Scale,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';

interface AnalysisPanelProps {
  signal?: ExplainableTradeSignalsOutput;
  patterns?: any[];
  isLoading?: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ signal, patterns = [], isLoading }) => {
  return (
    <div className="w-80 border-l bg-sidebar flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight uppercase">AI Confluence</h2>
        </div>
        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
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
            ) : signal ? (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border border-border/50 shadow-sm",
                  signal.direction === 'Bullish' ? "bg-green-500/5 border-green-500/20" : 
                  signal.direction === 'Bearish' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={cn(
                      "text-[10px] font-bold px-2 py-0.5",
                      signal.direction === 'Bullish' ? "bg-green-500 text-white" : 
                      signal.direction === 'Bearish' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {signal.direction.toUpperCase()}
                    </Badge>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Confidence</span>
                      <span className={cn(
                        "text-sm font-mono font-bold",
                        signal.confidence > 7 ? "text-primary" : "text-muted-foreground"
                      )}>{signal.confidence}/10</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Target className="w-2.5 h-2.5" /> Entry
                      </span>
                      <p className="text-[10px] font-bold font-mono text-foreground mt-0.5">{signal.entryZone}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Scale className="w-2.5 h-2.5" /> RR Ratio
                      </span>
                      <p className="text-[10px] font-bold font-mono text-primary mt-0.5">{signal.riskRewardRatio}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Stop Loss</span>
                      <p className="text-[10px] font-bold font-mono text-red-400 mt-0.5">{signal.stopLoss}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Take Profit</span>
                      <p className="text-[10px] font-bold font-mono text-green-400 mt-0.5">{signal.takeProfit}</p>
                    </div>
                  </div>

                  {signal.confluenceFactors && signal.confluenceFactors.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Alignment Factors</span>
                      <div className="flex flex-wrap gap-1">
                        {signal.confluenceFactors.map((f, i) => (
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
                      "{signal.reasoning}"
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-destructive" />
                    <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">Risk Warning</span>
                  </div>
                  <p className="text-[9px] leading-tight text-muted-foreground italic">
                    {signal.riskWarning}
                  </p>
                  <div className="pt-2 border-t border-destructive/10">
                    <p className="text-[8px] text-destructive/60 font-bold uppercase leading-none">AI Disclaimer</p>
                    <p className="text-[8px] text-muted-foreground mt-1">This analysis is based on rule-based algorithmic approximations and LLM synthesis. It is not financial advice.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5">
                <p className="text-xs text-muted-foreground px-4">Ready for deep analysis. Select an asset and timeframe to generate a high-confluence report.</p>
              </div>
            )}
          </section>

          {/* Pattern Health */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rule-Based Patterns</h3>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-[10px]">
                    Patterns are identified using deterministic mathematical rules. False positives are common.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-2">
              {patterns.length > 0 ? (
                patterns.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/30 group hover:border-accent/50 transition-all cursor-default">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-bold">{p.patternName}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(195,85,62,0.5)]" />
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
      
      <div className="p-4 bg-muted/5 border-t">
        <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95">
          Generate Detailed PDF
        </button>
      </div>
    </div>
  );
};

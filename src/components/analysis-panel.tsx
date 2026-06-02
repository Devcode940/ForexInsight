'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Stethoscope
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
          <h2 className="text-sm font-bold tracking-tight uppercase">AI Intelligence</h2>
        </div>
        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Signal Header */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Market Analysis</h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-32 bg-muted/40 rounded-xl" />
                <div className="h-20 bg-muted/40 rounded-xl" />
              </div>
            ) : signal ? (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border border-border/50",
                  signal.direction === 'Bullish' ? "bg-green-500/5 border-green-500/20" : 
                  signal.direction === 'Bearish' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={cn(
                      "text-[10px] font-bold px-2 py-0.5",
                      signal.direction === 'Bullish' ? "bg-green-500 text-white" : 
                      signal.direction === 'Bearish' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {signal.direction.toUpperCase()} BIAS
                    </Badge>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Confidence</span>
                      <span className="text-sm font-mono font-bold text-primary">{signal.confidence}/10</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Entry Zone</span>
                      <p className="text-[10px] font-bold font-mono text-foreground">{signal.entryZone}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/30">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Stop Loss</span>
                      <p className="text-[10px] font-bold font-mono text-red-400">{signal.stopLoss}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border/30 col-span-2">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Take Profit</span>
                      <p className="text-[10px] font-bold font-mono text-green-400">{signal.takeProfit}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-primary">
                      <ArrowRightCircle className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Reasoning</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground/80 font-medium italic">
                      "{signal.reasoning}"
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3 h-3 text-destructive" />
                    <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">Risk Warning</span>
                  </div>
                  <p className="text-[9px] leading-tight text-muted-foreground">
                    {signal.riskWarning}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5">
                <p className="text-xs text-muted-foreground px-4">Click "Get AI Analysis" to generate a deep-dive report on current market conditions.</p>
              </div>
            )}
          </section>

          {/* Pattern Recognition */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Stethoscope className="w-3.5 h-3.5 text-accent" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Patterns</h3>
            </div>
            
            <div className="space-y-2">
              {patterns.length > 0 ? (
                patterns.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-bold">{p.patternName}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(195,85,62,0.5)]" />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">{p.explanation}</p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center border border-dashed rounded-lg bg-muted/5">
                  <AlertCircle className="w-4 h-4 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-[10px] text-muted-foreground">No significant candle patterns detected</p>
                </div>
              )}
            </div>
          </section>

          {/* Momentum Metric */}
          {signal && (
            <section className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Analysis Weight</h3>
                <span className="text-xs font-bold font-mono">{(signal.confidence * 0.95).toFixed(1)}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" 
                  style={{ width: `${signal.confidence * 10}%` }}
                />
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-muted/5 border-t">
        <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">
          Download PDF Report
        </button>
      </div>
    </div>
  );
};

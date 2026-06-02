'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Zap, Target, AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
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
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Forecast</h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-24 bg-muted/40 rounded-xl" />
                <div className="h-4 w-3/4 bg-muted/40 rounded" />
              </div>
            ) : signal ? (
              <div className={cn(
                "p-4 rounded-xl border border-border/50",
                signal.signal === 'BUY' ? "bg-green-500/5 border-green-500/20" : 
                signal.signal === 'SELL' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
              )}>
                <div className="flex justify-between items-start mb-3">
                  <Badge className={cn(
                    "text-[10px] font-bold px-2 py-0.5",
                    signal.signal === 'BUY' ? "bg-green-500 text-white" : 
                    signal.signal === 'SELL' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {signal.signal} SIGNAL
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">CONFIDENCE: 88%</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/80 font-medium">
                  {signal.explanation}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5">
                <p className="text-xs text-muted-foreground">Select data to generate AI analysis</p>
              </div>
            )}
          </section>

          {/* Pattern Recognition */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="w-3.5 h-3.5 text-accent" />
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Visual Patterns</h3>
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
                  <p className="text-[10px] text-muted-foreground">Scanning for candles...</p>
                </div>
              )}
            </div>
          </section>

          {/* Summary Metric */}
          <section className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Momentum Score</h3>
              <span className="text-xs font-bold font-mono">7.2</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" 
                style={{ width: '72%' }}
              />
            </div>
          </section>
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-muted/5 border-t">
        <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">
          Export Full Report
        </button>
      </div>
    </div>
  );
};

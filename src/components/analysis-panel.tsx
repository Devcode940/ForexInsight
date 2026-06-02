
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Zap, Target, AlertCircle } from 'lucide-react';
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
    <div className="w-96 border-l bg-background flex flex-col h-full overflow-hidden">
      <CardHeader className="border-b bg-card/50 pb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-accent" />
          <CardTitle className="text-lg font-headline">AI Analysis</CardTitle>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Active Signal Section */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center">
              <Zap className="w-3 h-3 mr-1 text-primary" /> Current Signal
            </h3>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-20 bg-muted rounded-xl" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </div>
            ) : signal ? (
              <Card className={cn(
                "border-none shadow-lg",
                signal.signal === 'BUY' ? "bg-green-500/10" : signal.signal === 'SELL' ? "bg-red-500/10" : "bg-muted/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <Badge className={cn(
                      "px-4 py-1 text-xs font-bold",
                      signal.signal === 'BUY' ? "bg-green-500 hover:bg-green-600" : signal.signal === 'SELL' ? "bg-red-500 hover:bg-red-600" : "bg-gray-500"
                    )}>
                      {signal.signal}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">Confidence: 84%</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 italic">
                    "{signal.explanation}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Select data to generate signals.</p>
            )}
          </section>

          {/* Detected Patterns */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center">
              <Target className="w-3 h-3 mr-1 text-accent" /> Pattern Recognition
            </h3>
            <div className="space-y-3">
              {patterns.length > 0 ? (
                patterns.map((p, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-xl bg-card border border-border/50">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold">{p.patternName}</span>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter">Bullish Reversal</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{p.explanation}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-xs text-muted-foreground">No patterns detected in this window</p>
                </div>
              )}
            </div>
          </section>

          {/* Technical Snapshot */}
          <section className="bg-accent/5 p-4 rounded-xl border border-accent/20">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3">Market Sentiment Score</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full w-[75%]" />
              </div>
              <span className="text-xs font-bold font-mono">7.5/10</span>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};

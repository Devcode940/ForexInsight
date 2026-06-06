'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  BrainCircuit, 
  Zap, 
  Target, 
  Eye,
  ArrowRightCircle,
  Stethoscope,
  Scale,
  X,
  History,
  Clock,
  ExternalLink
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ExplainableTradeSignalsOutput } from '@/ai/flows/explainable-trade-signals';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { getSignalHistory, StoredSignal } from '@/lib/supabase/store';
import { formatDistanceToNow } from 'date-fns';

interface AnalysisPanelProps {
  signal?: ExplainableTradeSignalsOutput & { analyzedCandleCount?: number };
  patterns?: any[];
  isLoading?: boolean;
  onClose?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ signal, patterns = [], isLoading, onClose }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [history, setHistory] = useState<StoredSignal[]>([]);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    if (user && activeTab === 'history') {
      getSignalHistory(user.id).then(setHistory);
    }
  }, [user, activeTab, signal]);

  const SignalCard = ({ sig, candleCount, showHeader = true }: { sig: ExplainableTradeSignalsOutput | StoredSignal, candleCount?: number, showHeader?: boolean }) => {
    const isHistory = 'createdAt' in sig;
    const s = sig as any;

    return (
      <div className={cn(
        "p-4 rounded-xl border border-border/50 shadow-sm",
        s.direction === 'Bullish' ? "bg-green-500/5 border-green-500/20" : 
        s.direction === 'Bearish' ? "bg-red-500/5 border-red-500/20" : "bg-muted/10"
      )}>
        {isHistory && (
           <div className="flex justify-between items-center mb-3 pb-2 border-b border-border/30">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-foreground">{s.currencyPair} • {s.timeframe}</span>
               <span className="text-[8px] text-muted-foreground">{formatDistanceToNow(s.createdAt)} ago</span>
             </div>
             <Badge variant="outline" className="text-[8px] font-bold opacity-60">ID: {s.createdAt.toString().slice(-6)}</Badge>
           </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <Badge className={cn(
            "text-[10px] font-bold px-2 py-0.5",
            s.direction === 'Bullish' ? "bg-green-500 text-white" : 
            s.direction === 'Bearish' ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {s.direction.toUpperCase()}
          </Badge>
          <div className="text-right">
            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Confidence</span>
            <span className="text-sm font-mono font-bold text-primary">{s.confidence}/10</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Target className="w-2.5 h-2.5" /> Entry
            </span>
            <p className="text-[10px] font-bold font-mono text-foreground mt-0.5">{s.entryZone}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Scale className="w-2.5 h-2.5" /> RR Ratio
            </span>
            <p className="text-[10px] font-bold font-mono text-primary mt-0.5">{s.riskRewardRatio}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">SL</span>
            <p className="text-[10px] font-bold font-mono text-red-400 mt-0.5">{s.stopLoss}</p>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30">
            <span className="text-[8px] font-bold text-muted-foreground uppercase">TP</span>
            <p className="text-[10px] font-bold font-mono text-green-400 mt-0.5">{s.takeProfit}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-primary">
            <ArrowRightCircle className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Reasoning</span>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground/80 font-medium italic">
            "{s.reasoning}"
          </p>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none bg-muted/30 border-b h-10">
          <TabsTrigger value="current" className="text-[10px] font-bold uppercase tracking-wider">Analysis</TabsTrigger>
          <TabsTrigger value="history" className="text-[10px] font-bold uppercase tracking-wider gap-2">
            <History className="w-3 h-3" /> History
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="current" className="p-4 m-0 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-3">
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
                  <SignalCard sig={signal} />
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

          <TabsContent value="history" className="p-4 m-0 space-y-4">
            {history.length > 0 ? (
              history.map((h, i) => (
                <div key={i} className="pb-4 border-b last:border-0">
                  <SignalCard sig={h} />
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs font-medium">No saved signals yet.</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

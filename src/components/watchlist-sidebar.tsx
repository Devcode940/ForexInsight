'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, LayoutGrid, Search, Bell, Sparkles, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

const WATCHLIST_ITEMS = [
  { pair: 'EURUSD', price: '1.08420', change: '+0.15%', sentiment: 'Bullish', color: 'text-green-400' },
  { pair: 'GBPUSD', price: '1.26540', change: '-0.08%', sentiment: 'Neutral', color: 'text-gray-400' },
  { pair: 'USDJPY', price: '149.320', change: '+0.42%', sentiment: 'Strong Bullish', color: 'text-green-500' },
  { pair: 'AUDUSD', price: '0.65410', change: '-0.22%', sentiment: 'Bearish', color: 'text-red-400' },
  { pair: 'USDCAD', price: '1.34820', change: '+0.11%', sentiment: 'Bullish', color: 'text-green-400' },
  { pair: 'USDCHF', price: '0.88120', change: '-0.05%', sentiment: 'Neutral', color: 'text-gray-400' },
  { pair: 'XAUUSD', price: '2024.50', change: '+0.85%', sentiment: 'Bullish', color: 'text-green-400' },
];

interface WatchlistSidebarProps {
  activePair: string;
  onSelectPair: (pair: string) => void;
  onClose?: () => void;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({ activePair, onSelectPair, onClose }) => {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setJoined(true);
      setEmail('');
    }
  };

  return (
    <div className="w-full h-full border-r bg-sidebar flex flex-col overflow-hidden">
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight uppercase">Watchlist</h2>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
            {isMobile && onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -mr-2">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search symbols..." 
            className="pl-9 bg-muted/30 border-none h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {WATCHLIST_ITEMS.map((item) => (
            <div
              key={item.pair}
              onClick={() => onSelectPair(item.pair)}
              className={cn(
                "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-l-2 border-transparent",
                "hover:bg-sidebar-accent/50",
                activePair === item.pair ? "bg-sidebar-accent border-primary" : ""
              )}
            >
              <div className="space-y-0.5">
                <p className="font-bold text-sm tracking-tight">{item.pair}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{item.sentiment}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="font-mono text-sm font-medium tabular-nums">{item.price}</p>
                <div className={cn(
                  "flex items-center justify-end text-[10px] font-bold",
                  item.change.startsWith('+') ? "text-green-400" : "text-red-400"
                )}>
                  {item.change.startsWith('+') ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {item.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Waitlist Section */}
        <div className="p-4 mx-4 my-6 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">AI Pro Beta</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal">
            Get early access to multi-timeframe correlation analysis and 1-click execution.
          </p>
          {joined ? (
            <div className="text-[10px] font-bold text-green-400 flex items-center gap-1.5 py-1">
              <Sparkles className="w-3 h-3" />
              You're on the list!
            </div>
          ) : (
            <form onSubmit={handleJoinWaitlist} className="flex gap-1">
              <Input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" 
                className="h-8 text-[10px] bg-background border-border/50"
              />
              <Button size="icon" className="h-8 w-8 shrink-0">
                <Send className="h-3 w-3" />
              </Button>
            </form>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/5">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          <span>Market State</span>
          <span className="text-green-400">Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium">New York Session Active</span>
        </div>
      </div>
    </div>
  );
};

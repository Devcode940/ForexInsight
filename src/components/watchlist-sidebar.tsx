'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, LayoutGrid, Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({ activePair, onSelectPair }) => {
  return (
    <div className="w-72 border-r bg-sidebar h-full flex flex-col overflow-hidden">
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight uppercase">Watchlist</h2>
          </div>
          <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search symbols..." 
            className="pl-9 bg-muted/30 border-none h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
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

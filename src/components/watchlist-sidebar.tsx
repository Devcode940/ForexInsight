
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const WATCHLIST_ITEMS = [
  { pair: 'EURUSD', price: '1.08420', change: '+0.15%', sentiment: 'Bullish', color: 'text-green-400' },
  { pair: 'GBPUSD', price: '1.26540', change: '-0.08%', sentiment: 'Neutral', color: 'text-gray-400' },
  { pair: 'USDJPY', price: '149.320', change: '+0.42%', sentiment: 'Strong Bullish', color: 'text-green-500' },
  { pair: 'AUDUSD', price: '0.65410', change: '-0.22%', sentiment: 'Bearish', color: 'text-red-400' },
  { pair: 'USDCAD', price: '1.34820', change: '+0.11%', sentiment: 'Bullish', color: 'text-green-400' },
  { pair: 'USDCHF', price: '0.88120', change: '-0.05%', sentiment: 'Neutral', color: 'text-gray-400' },
];

interface WatchlistSidebarProps {
  activePair: string;
  onSelectPair: (pair: string) => void;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({ activePair, onSelectPair }) => {
  return (
    <div className="w-80 border-r bg-sidebar h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-primary/20 rounded-lg">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-headline font-bold">Watchlist</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {WATCHLIST_ITEMS.map((item) => (
          <Card
            key={item.pair}
            onClick={() => onSelectPair(item.pair)}
            className={cn(
              "p-3 cursor-pointer transition-all duration-200 bg-sidebar border-none hover:bg-sidebar-accent",
              activePair === item.pair && "bg-sidebar-accent ring-1 ring-primary/50"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm tracking-wide">{item.pair}</p>
                <p className="text-xs text-muted-foreground">{item.sentiment}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-medium">{item.price}</p>
                <div className={cn("flex items-center justify-end text-[10px] font-bold", item.change.startsWith('+') ? "text-green-400" : "text-red-400")}>
                  {item.change.startsWith('+') ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {item.change}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-widest">Market Status</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">New York Session</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

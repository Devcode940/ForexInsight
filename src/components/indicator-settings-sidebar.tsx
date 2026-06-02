
'use client';

import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings2, LineChart, Waves, Layers, Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface IndicatorConfig {
  enabled: boolean;
  period: number;
  color: string;
}

export interface IndicatorsState {
  sma: IndicatorConfig;
  ema: IndicatorConfig;
  bb: IndicatorConfig;
  rsi: IndicatorConfig;
}

interface IndicatorSettingsSidebarProps {
  indicators: IndicatorsState;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorsState>>;
  onClose: () => void;
}

export const IndicatorSettingsSidebar: React.FC<IndicatorSettingsSidebarProps> = ({ 
  indicators, 
  setIndicators,
  onClose
}) => {
  const updateIndicator = (key: keyof IndicatorsState, updates: Partial<IndicatorConfig>) => {
    setIndicators(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
      <CardHeader className="border-b flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-headline">Indicators</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* SMA Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-blue-400" />
                <Label className="font-bold cursor-pointer" onClick={() => updateIndicator('sma', { enabled: !indicators.sma.enabled })}>SMA</Label>
              </div>
              <Switch 
                checked={indicators.sma.enabled} 
                onCheckedChange={(val) => updateIndicator('sma', { enabled: val })} 
              />
            </div>
            {indicators.sma.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>Period</span>
                  <span className="font-mono text-foreground">{indicators.sma.period}</span>
                </div>
                <Slider 
                  value={[indicators.sma.period]} 
                  min={5} 
                  max={200} 
                  step={1} 
                  onValueChange={([val]) => updateIndicator('sma', { period: val })} 
                  className="py-2"
                />
              </div>
            )}
          </div>

          {/* EMA Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-yellow-400" />
                <Label className="font-bold cursor-pointer" onClick={() => updateIndicator('ema', { enabled: !indicators.ema.enabled })}>EMA</Label>
              </div>
              <Switch 
                checked={indicators.ema.enabled} 
                onCheckedChange={(val) => updateIndicator('ema', { enabled: val })} 
              />
            </div>
            {indicators.ema.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>Period</span>
                  <span className="font-mono text-foreground">{indicators.ema.period}</span>
                </div>
                <Slider 
                  value={[indicators.ema.period]} 
                  min={5} 
                  max={200} 
                  step={1} 
                  onValueChange={([val]) => updateIndicator('ema', { period: val })} 
                  className="py-2"
                />
              </div>
            )}
          </div>

          {/* Bollinger Bands */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <Label className="font-bold cursor-pointer" onClick={() => updateIndicator('bb', { enabled: !indicators.bb.enabled })}>Bollinger Bands</Label>
              </div>
              <Switch 
                checked={indicators.bb.enabled} 
                onCheckedChange={(val) => updateIndicator('bb', { enabled: val })} 
              />
            </div>
            {indicators.bb.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>Period</span>
                  <span className="font-mono text-foreground">{indicators.bb.period}</span>
                </div>
                <Slider 
                  value={[indicators.bb.period]} 
                  min={10} 
                  max={50} 
                  step={1} 
                  onValueChange={([val]) => updateIndicator('bb', { period: val })} 
                  className="py-2"
                />
              </div>
            )}
          </div>

          {/* RSI */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <Label className="font-bold cursor-pointer" onClick={() => updateIndicator('rsi', { enabled: !indicators.rsi.enabled })}>RSI</Label>
              </div>
              <Switch 
                checked={indicators.rsi.enabled} 
                onCheckedChange={(val) => updateIndicator('rsi', { enabled: val })} 
              />
            </div>
            {indicators.rsi.enabled && (
              <div className="space-y-3 pl-6">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>Smoothing</span>
                  <span className="font-mono text-foreground">{indicators.rsi.period}</span>
                </div>
                <Slider 
                  value={[indicators.rsi.period]} 
                  min={2} 
                  max={30} 
                  step={1} 
                  onValueChange={([val]) => updateIndicator('rsi', { period: val })} 
                  className="py-2"
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

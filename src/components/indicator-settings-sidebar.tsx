'use client';

import React, { useState, useEffect } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Settings2, LineChart, Waves, Layers, Activity, X, Key, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('finnhub_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const saveKey = () => {
    localStorage.setItem('finnhub_api_key', apiKey);
    window.location.reload(); // Refresh to trigger data refetch with new key
  };

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
          <CardTitle className="text-lg font-headline">Settings</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8">
          {/* Connection Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Real-Time Connectivity</h3>
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-tighter">Finnhub API Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter token..." 
                      className="h-9 pl-9 text-xs bg-background"
                    />
                  </div>
                  <Button size="sm" onClick={saveKey} className="h-9">Save</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground leading-tight italic">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <span>Your key is stored locally in your browser and never leaves your device.</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Indicators Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Visual Overlays</h3>
            </div>

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
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};
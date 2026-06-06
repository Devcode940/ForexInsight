'use client';

import React, { useState, useEffect } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings2, 
  LineChart as LineChartIcon, 
  Waves, 
  Activity, 
  X, 
  Key, 
  Globe, 
  BarChart3, 
  RotateCcw,
  BrainCircuit,
  CandlestickChart,
  TrendingUp,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  macd: { enabled: boolean; fast: number; slow: number; signal: number };
  volume: { enabled: boolean };
  showPatternLabels: boolean;
  chartType: 'candlestick' | 'line';
}

interface IndicatorSettingsSidebarProps {
  indicators: IndicatorsState;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorsState>>;
  customAiInstructions: string;
  setCustomAiInstructions: (val: string) => void;
  onClose: () => void;
}

export const IndicatorSettingsSidebar: React.FC<IndicatorSettingsSidebarProps> = ({ 
  indicators, 
  setIndicators,
  customAiInstructions,
  setCustomAiInstructions,
  onClose
}) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('finnhub_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const saveKey = () => {
    localStorage.setItem('finnhub_api_key', apiKey);
    window.location.reload();
  };

  const updateIndicator = (key: keyof IndicatorsState, updates: any) => {
    setIndicators(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'object' ? { ...prev[key], ...updates } : updates
    }));
  };

  const handleReset = () => {
    const defaults: IndicatorsState = {
      sma: { enabled: true, period: 20, color: '#3A86FF' },
      ema: { enabled: false, period: 50, color: '#FFBE0B' },
      bb: { enabled: false, period: 20, color: '#00F5D4' },
      rsi: { enabled: true, period: 14, color: '#9D4EDD' },
      macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
      volume: { enabled: true },
      showPatternLabels: true,
      chartType: 'candlestick'
    };
    setIndicators(defaults);
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
      <CardHeader className="border-b flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-headline font-bold">Trading Settings</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          {/* Chart Display Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chart Display</h3>
            </div>
            
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-tighter">Series Style</Label>
                <Tabs 
                  value={indicators.chartType} 
                  onValueChange={(val) => updateIndicator('chartType', val as any)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50">
                    <TabsTrigger value="candlestick" className="text-[10px] font-bold uppercase gap-2">
                      <CandlestickChart className="w-3.5 h-3.5" />
                      Candle
                    </TabsTrigger>
                    <TabsTrigger value="line" className="text-[10px] font-bold uppercase gap-2">
                      <LineChartIcon className="w-3.5 h-3.5" />
                      Line
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center justify-between py-2 px-1 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-accent" />
                  <Label className="text-[10px] font-bold uppercase tracking-tighter">Pattern Labels</Label>
                </div>
                <Switch 
                  checked={indicators.showPatternLabels} 
                  onCheckedChange={(val) => updateIndicator('showPatternLabels', val)} 
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Connectivity Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Connectivity</h3>
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-tighter">Data Provider (Finnhub)</Label>
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
                  <Button size="sm" onClick={saveKey} className="h-9 font-bold uppercase text-[10px]">Save</Button>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* AI Intelligence Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-accent" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Configuration</h3>
            </div>
            
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-tighter">Custom Instructions</Label>
                <Textarea 
                  value={customAiInstructions}
                  onChange={(e) => setCustomAiInstructions(e.target.value)}
                  placeholder="e.g. Focus on 5m scalping strategies using RSI and Price Action..." 
                  className="min-h-[100px] text-xs bg-background resize-none"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Indicators Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Technical Overlays</h3>
            </div>

            {/* MACD */}
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <Label className="text-xs font-bold">MACD</Label>
                </div>
                <Switch 
                  checked={indicators.macd.enabled} 
                  onCheckedChange={(val) => updateIndicator('macd', { enabled: val })} 
                />
              </div>
            </div>

            {/* SMA */}
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-blue-400" />
                  <Label className="text-xs font-bold">SMA</Label>
                </div>
                <Switch 
                  checked={indicators.sma.enabled} 
                  onCheckedChange={(val) => updateIndicator('sma', { enabled: val })} 
                />
              </div>
              {indicators.sma.enabled && (
                <div className="space-y-3 pl-6">
                  <Slider 
                    value={[indicators.sma.period]} 
                    min={5} max={200} step={1} 
                    onValueChange={([val]) => updateIndicator('sma', { period: val })} 
                  />
                  <span className="text-[10px] text-muted-foreground">Period: {indicators.sma.period}</span>
                </div>
              )}
            </div>

            {/* EMA */}
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-yellow-400" />
                  <Label className="text-xs font-bold">EMA</Label>
                </div>
                <Switch 
                  checked={indicators.ema.enabled} 
                  onCheckedChange={(val) => updateIndicator('ema', { enabled: val })} 
                />
              </div>
              {indicators.ema.enabled && (
                <div className="space-y-3 pl-6">
                  <Slider 
                    value={[indicators.ema.period]} 
                    min={5} max={200} step={1} 
                    onValueChange={([val]) => updateIndicator('ema', { period: val })} 
                  />
                  <span className="text-[10px] text-muted-foreground">Period: {indicators.ema.period}</span>
                </div>
              )}
            </div>

            {/* RSI */}
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <Label className="text-xs font-bold">RSI</Label>
                </div>
                <Switch 
                  checked={indicators.rsi.enabled} 
                  onCheckedChange={(val) => updateIndicator('rsi', { enabled: val })} 
                />
              </div>
              {indicators.rsi.enabled && (
                <div className="space-y-3 pl-6">
                  <Slider 
                    value={[indicators.rsi.period]} 
                    min={2} max={30} step={1} 
                    onValueChange={([val]) => updateIndicator('rsi', { period: val })} 
                  />
                  <span className="text-[10px] text-muted-foreground">Period: {indicators.rsi.period}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-muted/5 border-t">
        <Button 
          variant="outline" 
          className="w-full h-9 text-[10px] font-bold uppercase tracking-wider gap-2"
          onClick={handleReset}
        >
          <RotateCcw className="w-3 h-3" />
          Reset Defaults
        </Button>
      </div>
    </div>
  );
};
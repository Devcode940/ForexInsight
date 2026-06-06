'use server';
/**
 * @fileOverview This file defines an enhanced Genkit flow for generating intelligent trade signals with multi-timeframe confluence.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CandleDataSchema = z.object({
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  timestamp: z.number(),
});

const ExplainableTradeSignalsInputSchema = z.object({
  currencyPair: z.string().describe('The currency pair being analyzed.'),
  timeframe: z.string().describe('The primary chart timeframe.'),
  candles: z.array(CandleDataSchema).describe('Recent primary timeframe candles.'),
  correlationData: z.object({
    dailyTrend: z.enum(['Bullish', 'Bearish', 'Neutral']).optional(),
    h4Trend: z.enum(['Bullish', 'Bearish', 'Neutral']).optional(),
    summary: z.string().optional(),
  }).optional().describe('Context from higher timeframes.'),
  newsContext: z.array(z.string()).optional().describe('Relevant recent market news.'),
  indicators: z.object({
    sma: z.number().nullable().optional(),
    ema: z.number().nullable().optional(),
    rsi: z.number().nullable().optional(),
    macd: z.object({
      line: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }).optional(),
  }).optional(),
  detectedPatterns: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
});

const ExplainableTradeSignalsOutputSchema = z.object({
  direction: z.enum(['Bullish', 'Bearish', 'Neutral']),
  entryZone: z.string(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  riskRewardRatio: z.string(),
  confidence: z.number().min(1).max(10),
  confluenceFactors: z.array(z.string()),
  correlationAnalysis: z.string().describe('A brief explanation of how higher timeframes align with this trade.'),
  reasoning: z.string(),
  riskWarning: z.string(),
});

export async function getExplainableTradeSignals(input: z.infer<typeof ExplainableTradeSignalsInputSchema>) {
  return explainableTradeSignalsFlow(input);
}

const tradeSignalsPrompt = ai.definePrompt({
  name: 'explainableTradeSignalsPrompt',
  input: {schema: ExplainableTradeSignalsInputSchema},
  output: {schema: ExplainableTradeSignalsOutputSchema},
  prompt: `You are a Senior Institutional Forex Analyst. Analyze {{currencyPair}} on the {{timeframe}} chart.

MULT-TIMEFRAME CONTEXT:
{{#if correlationData}}
- Daily Trend: {{correlationData.dailyTrend}}
- H4 Trend: {{correlationData.h4Trend}}
- Correlation Notes: {{correlationData.summary}}
{{/if}}

MARKET NEWS:
{{#if newsContext}}
{{#each newsContext}}- {{this}}
{{/each}}
{{else}}No recent major news impact reported.{{/if}}

TECHNICAL DATA:
- RSI: {{indicators.rsi}}
- MACD: {{#if indicators.macd}}Line: {{indicators.macd.line}}, Histogram: {{indicators.macd.histogram}}{{else}}N/A{{/if}}
- Patterns: {{#each detectedPatterns}}{{this}}, {{/each}}

{{#if customInstructions}}
USER BIAS/INSTRUCTIONS:
{{{customInstructions}}}
{{/if}}

REQUIREMENTS:
1. Provide a trade direction based on multi-timeframe correlation. If the Daily trend is Bearish but the 5m is Bullish, flag this as a counter-trend trade with lower confidence.
2. Define a clear entry zone and risk parameters.
3. List confluence factors (e.g., "Daily EMA Support + 5m RSI Oversold").
4. Provide a reasoning that synthesizes technicals, correlation, and news.
`
});

const explainableTradeSignalsFlow = ai.defineFlow(
  {
    name: 'explainableTradeSignalsFlow',
    inputSchema: ExplainableTradeSignalsInputSchema,
    outputSchema: ExplainableTradeSignalsOutputSchema,
  },
  async (input) => {
    const {output} = await tradeSignalsPrompt(input);
    return output!;
  }
);

'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent trade signals in Forex trading.
 *
 * - getExplainableTradeSignals - A function that calls the Genkit flow to generate trade signals and explanations.
 * - ExplainableTradeSignalsInput - The input type for the getExplainableTradeSignals function.
 * - ExplainableTradeSignalsOutput - The return type for the getExplainableTradeSignals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CandleDataSchema = z.object({
  open: z.number().describe('Opening price of the candle.'),
  high: z.number().describe('Highest price of the candle.'),
  low: z.number().describe('Lowest price of the candle.'),
  close: z.number().describe('Closing price of the candle.'),
  timestamp: z.number().describe('Unix timestamp of the candle.'),
});

const ExplainableTradeSignalsInputSchema = z.object({
  currencyPair: z.string().describe('The currency pair being analyzed (e.g., "EURUSD").'),
  timeframe: z.string().describe('The current chart timeframe (e.g., "1m", "1H", "Daily").'),
  candles: z.array(CandleDataSchema).describe('An array of 50-100 recent past candlestick data for context.'),
  indicators: z.object({
    sma: z.number().nullable().optional().describe('Simple Moving Average value.'),
    ema: z.number().nullable().optional().describe('Exponential Moving Average value.'),
    rsi: z.number().nullable().optional().describe('Relative Strength Index value.'),
    macd: z.object({
      line: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }).optional().describe('MACD values.'),
  }).optional().describe('Current values of various technical indicators.'),
  detectedPatterns: z.array(z.string()).optional().describe('List of names of patterns detected in the current view.'),
});
export type ExplainableTradeSignalsInput = z.infer<typeof ExplainableTradeSignalsInputSchema>;

const ExplainableTradeSignalsOutputSchema = z.object({
  direction: z.enum(['Bullish', 'Bearish', 'Neutral']).describe('The potential market direction.'),
  entryZone: z.string().describe('Suggested Entry price zone.'),
  stopLoss: z.number().describe('Stop Loss level.'),
  takeProfit: z.number().describe('Take Profit level.'),
  confidence: z.number().min(1).max(10).describe('Confidence level from 1 to 10.'),
  reasoning: z.string().describe('Plain English reasoning for this analysis.'),
  riskWarning: z.string().describe('A standard risk warning.'),
});
export type ExplainableTradeSignalsOutput = z.infer<typeof ExplainableTradeSignalsOutputSchema>;

export async function getExplainableTradeSignals(input: ExplainableTradeSignalsInput): Promise<ExplainableTradeSignalsOutput> {
  return explainableTradeSignalsFlow(input);
}

const tradeSignalsPrompt = ai.definePrompt({
  name: 'explainableTradeSignalsPrompt',
  input: {schema: ExplainableTradeSignalsInputSchema},
  output: {schema: ExplainableTradeSignalsOutputSchema},
  prompt: `You are an expert Forex trader. Analyze the provided OHLC data, detected patterns, and indicators for {{currencyPair}} on the {{timeframe}} timeframe.

Technical Data Provided:
- Recent Candles ({{candles.length}} candles)
- Indicators: 
  - RSI: {{indicators.rsi}}
  - SMA: {{indicators.sma}}
  - MACD: {{#if indicators.macd}}Line: {{indicators.macd.line}}, Signal: {{indicators.macd.signal}}{{else}}N/A{{/if}}
- Patterns Detected: {{#each detectedPatterns}}{{this}}, {{/each}}

Based on this, provide:
1. Potential direction (Bullish/Bearish/Neutral)
2. Suggested Entry price zone
3. Stop Loss and Take Profit levels (numeric values based on current price action)
4. Confidence (1-10)
5. Plain English reasoning referencing the indicators and candles
6. Risk warning: This is not financial advice

{{#each candles}}
Candle: {{timestamp}}, O: {{open}}, H: {{high}}, L: {{low}}, C: {{close}}
{{/each}}
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

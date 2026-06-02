'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating explainable trade signals in Forex trading.
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
  volume: z.number().optional().describe('Trading volume for the candle.'),
  timestamp: z.number().describe('Unix timestamp (in milliseconds) of the candle close.'),
});

const ExplainableTradeSignalsInputSchema = z.object({
  currencyPair: z.string().describe('The currency pair being analyzed (e.g., "EURUSD").'),
  timeframe: z.string().describe('The current chart timeframe (e.g., "1m", "1H", "Daily").'),
  currentCandle: CandleDataSchema.describe('The most recent (current) candlestick data.'),
  recentCandles: z.array(CandleDataSchema).max(10).describe('An array of up to 10 recent past candlestick data for context.'),
  indicators: z.object({
    sma: z.array(z.object({period: z.number(), value: z.number().nullable()})).optional().describe('Simple Moving Averages for various periods.'),
    ema: z.array(z.object({period: z.number(), value: z.number().nullable()})).optional().describe('Exponential Moving Averages for various periods.'),
    rsi: z.number().nullable().optional().describe('Relative Strength Index value.'),
    macdA: z.number().nullable().optional().describe('MACD line value.'),
    macdB: z.number().nullable().optional().describe('MACD signal line value.'),
    bollingerBandsUpper: z.number().nullable().optional().describe('Upper Bollinger Band.'),
    bollingerBandsMiddle: z.number().nullable().optional().describe('Middle Bollinger Band (SMA).'),
    bollingerBandsLower: z.number().nullable().optional().describe('Lower Bollinger Band.'),
    fibonacciLevels: z.array(z.object({
      level: z.number().describe('Fibonacci level (e.g., 0.236, 0.382).'),
      price: z.number().describe('Corresponding price at this Fibonacci level.'),
    })).optional().describe('Calculated Fibonacci retracement levels.'),
  }).optional().describe('Current values of various technical indicators.'),
  detectedPatterns: z.array(z.object({
    type: z.enum(['candlestick', 'chart']).describe('Type of pattern (candlestick or chart).'),
    name: z.string().describe('Name of the detected pattern (e.g., "Hammer", "Head and Shoulders").'),
    strength: z.enum(['weak', 'moderate', 'strong']).optional().describe('Strength of the pattern, if applicable.'),
    signal: z.enum(['bullish', 'bearish', 'neutral']).optional().describe('Implied signal from the pattern, if applicable.'),
    candleIndexes: z.array(z.number()).optional().describe('Indices of candles involved in the pattern (0 is current, -1 is previous, etc.).'),
  })).optional().describe('Automatically detected candlestick and chart patterns.'),
});
export type ExplainableTradeSignalsInput = z.infer<typeof ExplainableTradeSignalsInputSchema>;

const ExplainableTradeSignalsOutputSchema = z.object({
  signal: z.enum(['BUY', 'SELL', 'HOLD']).describe('The trading signal: BUY, SELL, or HOLD.'),
  explanation: z.string().describe('A plain English explanation of the logic behind the signal, referencing market conditions, indicators, and patterns.'),
});
export type ExplainableTradeSignalsOutput = z.infer<typeof ExplainableTradeSignalsOutputSchema>;

export async function getExplainableTradeSignals(input: ExplainableTradeSignalsInput): Promise<ExplainableTradeSignalsOutput> {
  return explainableTradeSignalsFlow(input);
}

const tradeSignalsPrompt = ai.definePrompt({
  name: 'explainableTradeSignalsPrompt',
  input: {schema: ExplainableTradeSignalsInputSchema},
  output: {schema: ExplainableTradeSignalsOutputSchema},
  prompt: `You are an expert Forex market analyst providing clear, actionable trade signals and detailed explanations. Your task is to analyze the provided market data for the {{currencyPair}} on the {{timeframe}} timeframe and give a clear trading signal (BUY, SELL, or HOLD) along with a comprehensive, plain English explanation of your reasoning. Focus on clarity, conciseness, and the 'why' behind the signal, as if explaining it to a fellow trader.

Consider the following information:

Current Candlestick (most recent):
  Open: {{{currentCandle.open}}}
  High: {{{currentCandle.high}}}
  Low: {{{currentCandle.low}}}
  Close: {{{currentCandle.close}}}
  Timestamp: {{{currentCandle.timestamp}}}

Recent Candlestick Data (up to 10 past candles for context, from oldest to newest):
{{#each recentCandles}}
- Timestamp: {{{timestamp}}}, Open: {{{open}}}, High: {{{high}}}, Low: {{{low}}}, Close: {{{close}}}
{{/each}}

Technical Indicators:
{{#if indicators.sma}}
  Simple Moving Averages:
  {{#each indicators.sma}}
    - Period {{period}}: {{{value}}}
  {{/each}}
{{/if}}
{{#if indicators.ema}}
  Exponential Moving Averages:
  {{#each indicators.ema}}
    - Period {{period}}: {{{value}}}
  {{/each}}
{{/if}}
{{#if indicators.rsi}}
  Relative Strength Index (RSI): {{{indicators.rsi}}}
{{/if}}
{{#if indicators.macdA}}
  MACD Line: {{{indicators.macdA}}}
{{/if}}
{{#if indicators.macdB}}
  MACD Signal Line: {{{indicators.macdB}}}
{{/if}}
{{#if indicators.bollingerBandsUpper}}
  Bollinger Bands: Upper: {{{indicators.bollingerBandsUpper}}}, Middle: {{{indicators.bollingerBandsMiddle}}}, Lower: {{{indicators.bollingerBandsLower}}}
{{/if}}
{{#if indicators.fibonacciLevels}}
  Fibonacci Retracement Levels:
  {{#each indicators.fibonacciLevels}}
    - Level {{{level}}}: Price {{{price}}}
  {{/each}}
{{/if}}

Detected Patterns:
{{#if detectedPatterns}}
{{#each detectedPatterns}}
- Type: {{{type}}}, Name: "{{{name}}}"{{#if strength}} (Strength: {{{strength}}}){{/if}}{{#if signal}} (Implied Signal: {{{signal}}}){{/if}}
{{/each}}
{{else}}
No significant patterns detected.
{{/if}}

Based on this comprehensive analysis, provide your trade signal and a comprehensive, easy-to-understand explanation. Your explanation should clearly reference specific elements from the provided data (e.g., "RSI is oversold at X, indicating potential reversal", "A Hammer candlestick formed near support, suggesting bullish momentum"). Avoid jargon where possible, or explain it if used. The explanation should justify the signal thoroughly.
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

'use server';
/**
 * @fileOverview This file defines an enhanced Genkit flow for generating intelligent trade signals with confluence analysis.
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
  candles: z.array(CandleDataSchema).describe('An array of recent past candlestick data for context.'),
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
  customInstructions: z.string().optional().describe('User-provided custom instructions to bias the AI analysis.'),
});
export type ExplainableTradeSignalsInput = z.infer<typeof ExplainableTradeSignalsInputSchema>;

const ExplainableTradeSignalsOutputSchema = z.object({
  direction: z.enum(['Bullish', 'Bearish', 'Neutral']).describe('The potential market direction.'),
  entryZone: z.string().describe('Suggested Entry price zone.'),
  stopLoss: z.number().describe('Stop Loss level.'),
  takeProfit: z.number().describe('Take Profit level.'),
  riskRewardRatio: z.string().describe('The calculated Risk-Reward Ratio (e.g., "1:2.5").'),
  confidence: z.number().min(1).max(10).describe('Confidence level from 1 to 10 based on signal confluence.'),
  confluenceFactors: z.array(z.string()).describe('List of specific technical factors that align for this signal (e.g., "RSI Oversold + Hammer").'),
  reasoning: z.string().describe('Detailed reasoning for this analysis, explaining how indicators and patterns confirm each other.'),
  riskWarning: z.string().describe('A specific risk warning for this trade.'),
});
export type ExplainableTradeSignalsOutput = z.infer<typeof ExplainableTradeSignalsOutputSchema>;

export async function getExplainableTradeSignals(input: ExplainableTradeSignalsInput): Promise<ExplainableTradeSignalsOutput> {
  return explainableTradeSignalsFlow(input);
}

const tradeSignalsPrompt = ai.definePrompt({
  name: 'explainableTradeSignalsPrompt',
  input: {schema: ExplainableTradeSignalsInputSchema},
  output: {schema: ExplainableTradeSignalsOutputSchema},
  prompt: `You are a Senior Forex Analyst. Your goal is to find **high-probability confluence** for {{currencyPair}} on the {{timeframe}} timeframe.

Technical Environment:
- Recent Candles: {{candles.length}} candles provided.
- Indicators: 
  - RSI: {{indicators.rsi}}
  - SMA: {{indicators.sma}}
  - MACD: {{#if indicators.macd}}Line: {{indicators.macd.line}}, Signal: {{indicators.macd.signal}}{{else}}N/A{{/if}}
- Patterns Detected: {{#each detectedPatterns}}{{this}}, {{/each}}

{{#if customInstructions}}
USER CUSTOM CONFIGURATION (PRIORITIZE THIS):
{{{customInstructions}}}
{{/if}}

Analysis Requirements:
1. **Confluence Check**: Look for overlapping signals. For example, is there a Bullish Engulfing pattern at an EMA support line? Is RSI showing divergence?
2. **Trend Context**: Determine if the trend is with or against the signal.
3. **Risk Management**: Suggest a Stop Loss and Take Profit that provides a logical Risk-Reward Ratio (ideally 1:2 or better).
4. **Confidence Rating**: If indicators and patterns both point the same way, confidence should be high (8-10). If they conflict, be neutral or low confidence.
5. **Mandatory Warning**: ALWAYS include a risk warning stating that trading involves high risk and this is not financial advice.

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

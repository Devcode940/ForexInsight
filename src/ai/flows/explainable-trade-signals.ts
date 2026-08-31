import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeCustomInstructions } from '@/lib/input-sanitization';

// --- Rate limit config ---
const AI_RATE_LIMIT_MAX = 10; // 10 analyses
const AI_RATE_LIMIT_WINDOW_MS = 60_000; // per minute per user/session

// --- Zod Schemas ---
const CandleDataSchema = z.object({
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  timestamp: z.number(),
});

const CorrelationDataSchema = z.object({
  dailyTrend: z.enum(['Bullish', 'Bearish', 'Neutral']).optional(),
  h4Trend: z.enum(['Bullish', 'Bearish', 'Neutral']).optional(),
  summary: z.string().optional(),
});

const MacdIndicatorSchema = z.object({
  line: z.number(),
  signal: z.number(),
  histogram: z.number(),
});

const IndicatorsSchema = z.object({
  sma: z.number().nullable().optional(),
  ema: z.number().nullable().optional(),
  rsi: z.number().nullable().optional(),
  macd: MacdIndicatorSchema.optional(),
});

const ExplainableTradeSignalsInputSchema = z.object({
  currencyPair: z.string().describe('The currency pair being analyzed.'),
  timeframe: z.string().describe('The primary chart timeframe.'),
  candles: z.array(CandleDataSchema).describe('Recent primary timeframe candles.'),
  correlationData: CorrelationDataSchema.optional().describe('Context from higher timeframes.'),
  newsContext: z.array(z.string()).optional().describe('Relevant recent market news.'),
  indicators: IndicatorsSchema.optional(),
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

export type ExplainableTradeSignalsInput = z.infer<typeof ExplainableTradeSignalsInputSchema>;
export type ExplainableTradeSignalsOutput = z.infer<typeof ExplainableTradeSignalsOutputSchema>;

// --- Prompt Definition ---
const tradeSignalsPrompt = ai.definePrompt({
  name: 'explainableTradeSignalsPrompt',
  input: { schema: ExplainableTradeSignalsInputSchema },
  output: { schema: ExplainableTradeSignalsOutputSchema },
  prompt: `You are a Senior Institutional Forex Analyst. Analyze {{currencyPair}} on the {{timeframe}} chart.

MULTI-TIMEFRAME CONTEXT:
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
- MACD: {{#if indicators.macd}}Line: {{indicators.macd.line}}, Signal: {{indicators.macd.signal}}, Histogram: {{indicators.macd.histogram}}{{else}}N/A{{/if}}
- SMA: {{indicators.sma}}
- EMA: {{indicators.ema}}
- Patterns: {{#each detectedPatterns}}{{this}}, {{/each}}

{{#if customInstructions}}
USER BIAS/INSTRUCTIONS:
{{{customInstructions}}}
{{/if}}

REQUIREMENTS:
1. Provide a trade direction based on multi-timeframe correlation. If the Daily trend is Bearish but the 5m is Bullish, flag this as a counter-trend trade with lower confidence.
2. Define a clear entry zone and risk parameters. stopLoss and takeProfit MUST be numbers, not strings.
3. List confluence factors (e.g., "Daily EMA Support + 5m RSI Oversold").
4. Provide reasoning that synthesizes technicals, correlation, and news.
5. Always include a riskWarning that clarifies this is AI-generated analysis, not financial advice, and trading carries risk.
`
});

// --- Flow Definition ---
const explainableTradeSignalsFlow = ai.defineFlow(
  {
    name: 'explainableTradeSignalsFlow',
    inputSchema: ExplainableTradeSignalsInputSchema,
    outputSchema: ExplainableTradeSignalsOutputSchema,
  },
  async (input) => {
    // 1. Rate limit — keyed by currency pair + a coarse session identifier
    // In a real auth setup, this would be keyed by user ID
    const rlKey = `ai-analysis:${input.currencyPair}`;
    const rl = checkRateLimit({
      key: rlKey,
      max: AI_RATE_LIMIT_MAX,
      windowMs: AI_RATE_LIMIT_WINDOW_MS,
    });

    if (!rl.allowed) {
      const retrySec = Math.ceil((rl.resetAt - Date.now()) / 1000);
      throw new Error(`AI analysis rate limit exceeded. Try again in ${retrySec}s.`);
    }

    // 2. Sanitize custom instructions (defense against prompt injection)
    let sanitizedInput = input;
    if (input.customInstructions) {
      const { clean, warnings, truncated } = sanitizeCustomInstructions(input.customInstructions);
      if (warnings.length > 0) {
        console.warn('[TradeSignals] Custom instructions sanitized:', warnings.join('; '));
      }
      sanitizedInput = {
        ...input,
        customInstructions: clean || undefined,
      };
      if (truncated) {
        sanitizedInput = {
          ...sanitizedInput,
          customInstructions: clean
            ? `${clean} [NOTE: User input truncated for safety]`
            : undefined,
        };
      }
    }

    // 3. Cap candle count to prevent token exhaustion
    const MAX_CANDLES = 100;
    const candles = sanitizedInput.candles.length > MAX_CANDLES
      ? sanitizedInput.candles.slice(-MAX_CANDLES)
      : sanitizedInput.candles;

    const finalInput = { ...sanitizedInput, candles };

    const result = await tradeSignalsPrompt(finalInput);

    // Validate output — LLM can hallucinate; ensure we have safe defaults
    if (!result.output) {
      throw new Error('AI returned empty output');
    }

    // Post-process: ensure numeric fields are actually numbers
    const output = result.output;
    output.stopLoss = Number(output.stopLoss);
    output.takeProfit = Number(output.takeProfit);
    output.confidence = Math.max(1, Math.min(10, Number(output.confidence)));

    if (isNaN(output.stopLoss) || isNaN(output.takeProfit)) {
      throw new Error('AI returned invalid numeric values for stopLoss/takeProfit');
    }

    return output;
  }
);

export async function getExplainableTradeSignals(
  input: ExplainableTradeSignalsInput
): Promise<ExplainableTradeSignalsOutput> {
  return explainableTradeSignalsFlow(input);
}

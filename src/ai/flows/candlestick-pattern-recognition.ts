'use server';
/**
 * @fileOverview A Genkit flow for detecting common candlestick patterns in Forex data.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Constants ---
const MAX_CANDLES_FOR_LLM = 200;
const MIN_CANDLES_FOR_PATTERNS = 3;

// --- Input Schema ---
const CandlestickInputSchema = z.object({
  candles: z.array(
    z.object({
      open: z.number(),
      high: z.number(),
      low: z.number(),
      close: z.number(),
      time: z.union([z.string(), z.number()]),
    })
  ).describe('An array of candlestick data, sorted from oldest to newest.'),
  marketContext: z
    .string()
    .optional()
    .describe('Optional broader market context or current news.'),
});

export type CandlestickPatternRecognitionInput = z.infer<typeof CandlestickInputSchema>;

// --- Output Schema ---
const CandlestickPatternOutputSchema = z.object({
  patterns: z.array(
    z.object({
      patternName: z.string(),
      startIndex: z.number(),
      endIndex: z.number(),
      explanation: z.string(),
    })
  ),
});

export type CandlestickPatternRecognitionOutput = z.infer<
  typeof CandlestickPatternOutputSchema
>;

// --- Prompt Definition ---
const candlestickPatternRecognitionPrompt = ai.definePrompt({
  name: 'candlestickPatternRecognitionPrompt',
  input: {
    schema: z.object({
      candlestickDataJson: z.string(),
      marketContext: z.string().optional(),
    }),
  },
  output: { schema: CandlestickPatternOutputSchema },
  prompt: `You are an expert Forex technical analyst. Given the following candlestick data, identify common candlestick patterns such as Hammer, Engulfing, Doji, Morning Star, Evening Star, Piercing Line, Dark Cloud Cover, Three White Soldiers, Three Black Crows. Focus on patterns that indicate potential trend reversals or continuations.

Provide a clear, concise explanation for each detected pattern. Ensure that startIndex and endIndex are 0-based integers within the bounds of the provided array (0 to N-1), and startIndex <= endIndex.

Candlestick Data (array of objects, sorted from oldest to newest):
{{{candlestickDataJson}}}

{{#if marketContext}}
Current Market Context:
{{{marketContext}}}
{{/if}}

If no patterns are found, return an empty array for 'patterns'.`,
});

// --- Flow Definition ---
const candlestickPatternRecognitionFlow = ai.defineFlow(
  {
    name: 'candlestickPatternRecognitionFlow',
    inputSchema: CandlestickInputSchema,
    outputSchema: CandlestickPatternOutputSchema,
  },
  async (input) => {
    // Guard: need at least a few candles to detect patterns
    if (input.candles.length < MIN_CANDLES_FOR_PATTERNS) {
      return { patterns: [] };
    }

    // Cap input size to avoid excessive token usage
    const candles =
      input.candles.length > MAX_CANDLES_FOR_LLM
        ? input.candles.slice(-MAX_CANDLES_FOR_LLM)
        : input.candles;

    // Normalize time field to string for consistent serialization
    const normalizedCandles = candles.map((c) => ({
      ...c,
      time: String(c.time),
    }));

    const candlestickDataJson = JSON.stringify(normalizedCandles);

    const result = await candlestickPatternRecognitionPrompt({
      candlestickDataJson,
      marketContext: input.marketContext,
    });

    // Graceful fallback if LLM returns nothing usable
    if (!result.output || !Array.isArray(result.output.patterns)) {
      console.warn('[PatternRecognition] AI returned invalid output');
      return { patterns: [] };
    }

    // Validate pattern indices are within bounds of the array we actually sent
    const candleCount = normalizedCandles.length;
    const safePatterns = result.output.patterns.filter((p) => {
      const startOk = Number.isInteger(p.startIndex) && p.startIndex >= 0;
      const endOk = Number.isInteger(p.endIndex) && p.endIndex < candleCount;
      const orderOk = p.startIndex <= p.endIndex;
      const nameOk = typeof p.patternName === 'string' && p.patternName.length > 0;
      return startOk && endOk && orderOk && nameOk;
    });

    return { patterns: safePatterns };
  }
);

export async function detectCandlestickPatterns(
  input: CandlestickPatternRecognitionInput
): Promise<CandlestickPatternRecognitionOutput> {
  return candlestickPatternRecognitionFlow(input);
}

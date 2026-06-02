'use server';
/**
 * @fileOverview A Genkit flow for detecting common candlestick patterns in Forex data.
 *
 * - detectCandlestickPatterns - A function that processes candlestick data to identify patterns.
 * - CandlestickPatternRecognitionInput - The input type for the detectCandlestickPatterns function.
 * - CandlestickPatternRecognitionOutput - The return type for the detectCandlestickPatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CandlestickInputSchema = z.object({
  candles: z.array(
    z.object({
      open: z.number().describe('The opening price of the candlestick.'),
      high: z.number().describe('The highest price reached during the candlestick period.'),
      low: z.number().describe('The lowest price reached during the candlestick period.'),
      close: z.number().describe('The closing price of the candlestick.'),
      time: z.string().describe('The timestamp of the candlestick (ISO 8601 string or similar).'),
    })
  ).describe('An array of candlestick data, sorted from oldest to newest.'),
  marketContext: z.string().optional().describe('Optional broader market context or current news that might influence price action.'),
});
export type CandlestickPatternRecognitionInput = z.infer<typeof CandlestickInputSchema>;

const CandlestickPatternOutputSchema = z.object({
  patterns: z.array(
    z.object({
      patternName: z.string().describe('The name of the detected candlestick pattern (e.g., "Hammer", "Bullish Engulfing", "Doji").'),
      startIndex: z.number().describe('The 0-based index of the first candle in the pattern within the provided candlestick data array.'),
      endIndex: z.number().describe('The 0-based index of the last candle in the pattern within the provided candlestick data array.'),
      explanation: z.string().describe('A concise explanation of the pattern, its significance, and potential market implications.'),
    })
  ).describe('An array of detected candlestick patterns, along with their details.'),
});
export type CandlestickPatternRecognitionOutput = z.infer<typeof CandlestickPatternOutputSchema>;

export async function detectCandlestickPatterns(input: CandlestickPatternRecognitionInput): Promise<CandlestickPatternRecognitionOutput> {
  return candlestickPatternRecognitionFlow(input);
}

const candlestickPatternRecognitionPrompt = ai.definePrompt({
  name: 'candlestickPatternRecognitionPrompt',
  input: {
    schema: z.object({
      candlestickDataJson: z.string().describe('A JSON string representing an array of candlestick data.'),
      marketContext: z.string().optional().describe('Optional broader market context or current news.'),
    })
  },
  output: { schema: CandlestickPatternOutputSchema },
  prompt: `You are an expert Forex technical analyst. Given the following candlestick data, identify common candlestick patterns such as Hammer, Engulfing, Doji, Morning Star, Evening Star, Piercing Line, Dark Cloud Cover, Three White Soldiers, Three Black Crows. Focus on patterns that indicate potential trend reversals or continuations.

Provide a clear, concise explanation for each detected pattern, including its significance and potential market implications. Ensure that the start and end indices accurately reflect the candles forming the pattern within the provided array.

Candlestick Data (array of objects, sorted from oldest to newest):
{{{candlestickDataJson}}}

{{#if marketContext}}
Current Market Context:
{{{marketContext}}}
{{/if}}

Output your findings as a JSON array of objects according to the specified schema. If no patterns are found, return an empty array for 'patterns'.`
});

const candlestickPatternRecognitionFlow = ai.defineFlow(
  {
    name: 'candlestickPatternRecognitionFlow',
    inputSchema: CandlestickInputSchema,
    outputSchema: CandlestickPatternOutputSchema,
  },
  async (input) => {
    // Stringify the candles array to pass it as a single string to the prompt
    const candlestickDataJson = JSON.stringify(input.candles);

    const {output} = await candlestickPatternRecognitionPrompt({
      candlestickDataJson,
      marketContext: input.marketContext,
    });
    return output!;
  }
);

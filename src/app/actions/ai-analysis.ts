'use server';

/**
 * Server-action wrappers for AI analysis jobs.
 *
 * Routes jobs through the AI queue layer (@/lib/ai-queue):
 *   - When Redis is available: jobs go to BullMQ and are processed by the
 *     standalone AI worker (npm run ai:worker). This keeps slow LLM calls
 *     out of the Next.js request pool.
 *   - When Redis is NOT available: falls back to inline execution within
 *     the Next.js process (local dev default).
 *
 * Client components must import from HERE, never from src/ai/flows/*.
 * The Genkit runtime + grpc-js must never reach the client bundle.
 */

import {
  enqueueTradeSignalAnalysis,
  enqueuePatternRecognition,
  enqueueTTS,
} from '@/lib/ai-queue';
import type {
  ExplainableTradeSignalsInput,
  ExplainableTradeSignalsOutput,
} from '@/ai/flows/explainable-trade-signals';
import type {
  CandlestickPatternRecognitionInput,
  CandlestickPatternRecognitionOutput,
} from '@/ai/flows/candlestick-pattern-recognition';
import type {
  AnalysisTTSInput,
  AnalysisTTSOutput,
} from '@/ai/flows/analysis-tts';

/**
 * Generate an explainable trade signal from market data and indicators.
 */
export async function runTradeSignalAnalysis(
  input: ExplainableTradeSignalsInput
): Promise<ExplainableTradeSignalsOutput> {
  return enqueueTradeSignalAnalysis(input);
}

/**
 * Detect candlestick patterns using AI.
 */
export async function runPatternRecognition(
  input: CandlestickPatternRecognitionInput
): Promise<CandlestickPatternRecognitionOutput> {
  return enqueuePatternRecognition(input);
}

/**
 * Convert analysis text to speech audio.
 */
export async function runAnalysisTTS(
  input: AnalysisTTSInput
): Promise<AnalysisTTSOutput> {
  return enqueueTTS(input);
}

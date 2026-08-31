'use server';

/**
 * Thin server-action wrappers around the Genkit AI flows.
 *
 * IMPORTANT: Client components must import from this file, NOT directly
 * from src/ai/flows/*. The Genkit runtime and its Node-only dependencies
 * (grpc-js, etc.) must never reach the client bundle.
 */

import {
  getExplainableTradeSignals,
  type ExplainableTradeSignalsInput,
  type ExplainableTradeSignalsOutput,
} from '@/ai/flows/explainable-trade-signals';
import {
  detectCandlestickPatterns,
  type CandlestickPatternRecognitionInput,
  type CandlestickPatternRecognitionOutput,
} from '@/ai/flows/candlestick-pattern-recognition';
import {
  generateAnalysisAudio,
  type AnalysisTTSInput,
  type AnalysisTTSOutput,
} from '@/ai/flows/analysis-tts';

/**
 * Generate an explainable trade signal from market data and indicators.
 * Server-only — calls Genkit + Gemini.
 */
export async function runTradeSignalAnalysis(
  input: ExplainableTradeSignalsInput
): Promise<ExplainableTradeSignalsOutput> {
  return getExplainableTradeSignals(input);
}

/**
 * Detect candlestick patterns using AI.
 * Server-only — calls Genkit + Gemini.
 */
export async function runPatternRecognition(
  input: CandlestickPatternRecognitionInput
): Promise<CandlestickPatternRecognitionOutput> {
  return detectCandlestickPatterns(input);
}

/**
 * Convert analysis text to speech audio.
 * Server-only — calls Gemini TTS model.
 */
export async function runAnalysisTTS(
  input: AnalysisTTSInput
): Promise<AnalysisTTSOutput> {
  return generateAnalysisAudio(input);
}

/**
 * AI analysis queue client.
 *
 * Provides a unified interface for running AI analysis jobs:
 *   - When Redis is available: jobs are enqueued via BullMQ and processed
 *     by the standalone worker (src/ai/worker.ts). This prevents slow LLM
 *     calls from blocking Next.js server resources.
 *   - When Redis is NOT available: falls back to inline execution within
 *     the Next.js process. This is the default for local development.
 *
 * All callers use the same functions (enqueueTradeSignalAnalysis, etc.)
 * regardless of which mode is active.
 */

import { Queue, Job } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '@/lib/redis';
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

// --- Queue names ---
export const QUEUE_NAMES = {
  TRADE_SIGNAL: 'ai:trade-signal',
  PATTERN_RECOGNITION: 'ai:pattern-recognition',
  TTS: 'ai:tts',
} as const;

// --- Job options ---
const DEFAULT_JOB_OPTS = {
  attempts: 2,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: { count: 100 }, // keep last 100 completed for debugging
  removeOnFail: { count: 50 },
  timeout: 60_000, // 60s hard deadline per AI job
};

// --- Singleton queue instances ---
let tradeSignalQueue: Queue | null = null;
let patternQueue: Queue | null = null;
let ttsQueue: Queue | null = null;

function getQueue(name: string): Queue | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  switch (name) {
    case QUEUE_NAMES.TRADE_SIGNAL:
      if (!tradeSignalQueue) {
        tradeSignalQueue = new Queue(name, { connection: conn });
      }
      return tradeSignalQueue;
    case QUEUE_NAMES.PATTERN_RECOGNITION:
      if (!patternQueue) {
        patternQueue = new Queue(name, { connection: conn });
      }
      return patternQueue;
    case QUEUE_NAMES.TTS:
      if (!ttsQueue) {
        ttsQueue = new Queue(name, { connection: conn });
      }
      return ttsQueue;
    default:
      return null;
  }
}

/**
 * Wait for a job to complete and return its result.
 * Uses simple polling (BullMQ v6's waitUntilFinished requires QueueEvents).
 * Throws if the job fails or times out.
 */
async function awaitJobResult<T>(job: Job<T>): Promise<T> {
  const timeoutMs = DEFAULT_JOB_OPTS.timeout + 5_000;
  const pollIntervalMs = 1000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = await job.getState();
    if (state === 'completed') {
      // Job is done — return the stored result
      return (job as any).returnvalue as T;
    }
    if (state === 'failed') {
      const failedReason = (job as any).failedReason || 'Job failed';
      throw new Error(`Job ${job.id} failed: ${failedReason}`);
    }
    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Job ${job.id} timed out after ${timeoutMs}ms`);
}

// --- Public API ---

/**
 * Enqueue (or run inline) a trade signal analysis job.
 */
export async function enqueueTradeSignalAnalysis(
  input: ExplainableTradeSignalsInput,
  jobId?: string
): Promise<ExplainableTradeSignalsOutput> {
  const redisAvailable = await isRedisAvailable();

  if (!redisAvailable) {
    // Fallback: run directly in this process
    return getExplainableTradeSignals(input);
  }

  const queue = getQueue(QUEUE_NAMES.TRADE_SIGNAL);
  if (!queue) return getExplainableTradeSignals(input);

  const job = await queue.add(
    'analyze',
    input,
    {
      ...DEFAULT_JOB_OPTS,
      jobId,
    }
  );

  return awaitJobResult<ExplainableTradeSignalsOutput>(job);
}

/**
 * Enqueue (or run inline) a candlestick pattern recognition job.
 */
export async function enqueuePatternRecognition(
  input: CandlestickPatternRecognitionInput,
  jobId?: string
): Promise<CandlestickPatternRecognitionOutput> {
  const redisAvailable = await isRedisAvailable();

  if (!redisAvailable) {
    return detectCandlestickPatterns(input);
  }

  const queue = getQueue(QUEUE_NAMES.PATTERN_RECOGNITION);
  if (!queue) return detectCandlestickPatterns(input);

  const job = await queue.add('recognize', input, {
    ...DEFAULT_JOB_OPTS,
    jobId,
  });

  return awaitJobResult<CandlestickPatternRecognitionOutput>(job);
}

/**
 * Enqueue (or run inline) a text-to-speech job.
 */
export async function enqueueTTS(
  input: AnalysisTTSInput,
  jobId?: string
): Promise<AnalysisTTSOutput> {
  const redisAvailable = await isRedisAvailable();

  if (!redisAvailable) {
    return generateAnalysisAudio(input);
  }

  const queue = getQueue(QUEUE_NAMES.TTS);
  if (!queue) return generateAnalysisAudio(input);

  const job = await queue.add('synthesize', input, {
    ...DEFAULT_JOB_OPTS,
    jobId,
  });

  return awaitJobResult<AnalysisTTSOutput>(job);
}

/**
 * Gracefully close all queue connections.
 * Called during shutdown.
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [tradeSignalQueue, patternQueue, ttsQueue];
  for (const q of queues) {
    if (q) {
      try {
        await q.close();
      } catch (e) {
        console.warn('[AIQueue] Error closing queue:', e instanceof Error ? e.message : String(e));
      }
    }
  }
  tradeSignalQueue = null;
  patternQueue = null;
  ttsQueue = null;
}

/**
 * Standalone AI worker process.
 *
 * Consumes AI analysis jobs from BullMQ queues and processes them using
 * Genkit + Gemini. Run this as a separate service from the Next.js web app:
 *
 *   npm run ai:worker
 *
 * Environment variables:
 *   REDIS_URL              - Redis connection (required for queue mode)
 *   GEMINI_API_KEY         - Google AI API key (required)
 *   AI_WORKER_CONCURRENCY  - Max concurrent jobs per worker (default: 3)
 *   AI_WORKER_SHUTDOWN_DELAY_MS - Graceful shutdown wait (default: 30000)
 */

// Load env vars explicitly before anything else
import { config } from 'dotenv';
config();

import { Worker } from 'bullmq';
import { getRedisConnection, closeRedisConnection } from '@/lib/redis';
import { QUEUE_NAMES } from '@/lib/ai-queue';
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

const CONCURRENCY = parseInt(process.env.AI_WORKER_CONCURRENCY || '3', 10);
const SHUTDOWN_DELAY_MS = parseInt(
  process.env.AI_WORKER_SHUTDOWN_DELAY_MS || '30000',
  10
);

// Track active workers for graceful shutdown
const activeWorkers: Worker[] = [];

function logInfo(msg: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  console.info(`[AIWorker:${ts}] ${msg}${payload}`);
}

function logError(msg: string, err: unknown): void {
  const ts = new Date().toISOString();
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[AIWorker:${ts}] ERROR ${msg}: ${message}`);
}

function createTradeSignalWorker(): Worker | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  const worker = new Worker<ExplainableTradeSignalsInput, ExplainableTradeSignalsOutput>(
    QUEUE_NAMES.TRADE_SIGNAL,
    async (job) => {
      logInfo(`Processing trade signal job ${job.id}`, {
        pair: job.data.currencyPair,
        tf: job.data.timeframe,
        candles: job.data.candles?.length,
        attempt: job.attemptsMade,
      });
      const result = await getExplainableTradeSignals(job.data);
      logInfo(`Completed trade signal job ${job.id}`, {
        direction: result.direction,
        confidence: result.confidence,
      });
      return result;
    },
    {
      connection: conn,
      concurrency: CONCURRENCY,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  worker.on('failed', (job, err) => {
    logError(`Job ${job?.id} failed`, err);
  });

  worker.on('error', (err) => {
    logError('Worker error', err);
  });

  return worker;
}

function createPatternWorker(): Worker | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  const worker = new Worker<CandlestickPatternRecognitionInput, CandlestickPatternRecognitionOutput>(
    QUEUE_NAMES.PATTERN_RECOGNITION,
    async (job) => {
      logInfo(`Processing pattern recognition job ${job.id}`, {
        candles: job.data.candles?.length,
      });
      return detectCandlestickPatterns(job.data);
    },
    { connection: conn, concurrency: CONCURRENCY }
  );

  worker.on('failed', (job, err) => logError(`Pattern job ${job?.id} failed`, err));
  worker.on('error', (err) => logError('Pattern worker error', err));

  return worker;
}

function createTTSWorker(): Worker | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  const worker = new Worker<AnalysisTTSInput, AnalysisTTSOutput>(
    QUEUE_NAMES.TTS,
    async (job) => {
      logInfo(`Processing TTS job ${job.id}`, {
        voice: job.data.voice,
        length: job.data.text?.length,
      });
      return generateAnalysisAudio(job.data);
    },
    { connection: conn, concurrency: Math.max(1, Math.floor(CONCURRENCY / 2)) }
  );

  worker.on('failed', (job, err) => logError(`TTS job ${job?.id} failed`, err));
  worker.on('error', (err) => logError('TTS worker error', err));

  return worker;
}

/**
 * Graceful shutdown: stop accepting new jobs, wait for in-flight jobs
 * to complete (up to SHUTDOWN_DELAY_MS), then close connections and exit.
 */
async function shutdown(signal: string): Promise<void> {
  logInfo(`Received ${signal}, initiating graceful shutdown...`);

  // 1. Tell all workers to pause (don't pick up new jobs)
  for (const worker of activeWorkers) {
    try {
      await worker.pause(true); // true = wait for current job
    } catch (e) {
      logError('Error pausing worker', e);
    }
  }

  // 2. Give in-flight jobs time to finish
  logInfo(`Waiting up to ${SHUTDOWN_DELAY_MS}ms for in-flight jobs...`);
  const shutdownTimeout = setTimeout(() => {
    logError('Shutdown timeout exceeded — forcing exit', null);
    process.exit(1);
  }, SHUTDOWN_DELAY_MS);

  // 3. Close all workers
  for (const worker of activeWorkers) {
    try {
      await worker.close();
    } catch (e) {
      logError('Error closing worker', e);
    }
  }

  clearTimeout(shutdownTimeout);

  // 4. Close Redis connection
  await closeRedisConnection();

  logInfo('Shutdown complete');
  process.exit(0);
}

// --- Main entry point ---
function main(): void {
  const conn = getRedisConnection();
  if (!conn) {
    logError(
      'Redis not configured. Set REDIS_URL or REDIS_HOST to use the queue worker.',
      null
    );
    logInfo('Without Redis, the Next.js app will fall back to inline execution.', null);
    process.exit(1);
  }

  const tradeSignalWorker = createTradeSignalWorker();
  const patternWorker = createPatternWorker();
  const ttsWorker = createTTSWorker();

  for (const w of [tradeSignalWorker, patternWorker, ttsWorker]) {
    if (w) activeWorkers.push(w);
  }

  if (activeWorkers.length === 0) {
    logError('No workers started — exiting', null);
    process.exit(1);
  }

  logInfo(`AI worker started with ${activeWorkers.length} queue(s)`, {
    concurrency: CONCURRENCY,
    queues: activeWorkers.map((w) => w.name),
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled errors — log and keep running
  process.on('uncaughtException', (err) => {
    logError('Uncaught exception', err);
  });
  process.on('unhandledRejection', (reason) => {
    logError('Unhandled rejection', reason);
  });
}

main();

/**
 * Redis connection factory for BullMQ queues.
 *
 * Configuration via environment variables:
 *   REDIS_URL          - full Redis connection URL (e.g., redis://user:pass@host:port/db)
 *   REDIS_HOST         - fallback host (default: localhost)
 *   REDIS_PORT         - fallback port (default: 6379)
 *   REDIS_PASSWORD     - fallback password
 *   REDIS_DB           - fallback DB number (default: 0)
 *
 * If no Redis is configured, isRedisAvailable() returns false and the
 * queue layer falls back to inline execution (see ai-queue.ts).
 */

import Redis from 'ioredis';

let connection: Redis | null = null;
let availabilityChecked = false;
let isAvailable = false;

function buildRedisUrl(): string | null {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  // Only auto-connect if non-default host is explicitly configured,
  // or if we're in production (where Redis is expected).
  if (host !== 'localhost' || process.env.NODE_ENV === 'production') {
    const auth = password ? `:${password}@` : '';
    return `redis://${auth}${host}:${port}/${db}`;
  }

  return null;
}

/**
 * Get or create a shared Redis connection.
 * Returns null if Redis is not configured.
 */
export function getRedisConnection(): Redis | null {
  if (connection) return connection;

  const url = buildRedisUrl();
  if (!url) return null;

  connection = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    // Don't crash the process on connection errors — the queue layer
    // will fall back gracefully.
    reconnectOnError: (err) => {
      console.warn('[Redis] Reconnecting after error:', err.message);
      return true;
    },
  });

  connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
    isAvailable = false;
  });

  connection.on('ready', () => {
    console.info('[Redis] Connection ready');
    isAvailable = true;
    availabilityChecked = true;
  });

  connection.on('close', () => {
    isAvailable = false;
  });

  return connection;
}

/**
 * Probe whether Redis is available.
 * In development without Redis configured, returns false quickly so the
 * fallback inline-execution path is used.
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (availabilityChecked) return isAvailable;

  const conn = getRedisConnection();
  if (!conn) {
    availabilityChecked = true;
    isAvailable = false;
    return false;
  }

  try {
    await conn.ping();
    isAvailable = true;
  } catch {
    isAvailable = false;
  }
  availabilityChecked = true;
  return isAvailable;
}

/**
 * Close the shared Redis connection.
 * Called during graceful shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
    availabilityChecked = false;
    isAvailable = false;
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/config';
import { HEALTH } from '@/lib/constants';
import { isRedisAvailable } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  checks: {
    supabase: 'ok' | 'error' | 'skipped';
    supabaseLatencyMs?: number;
    redis: 'ok' | 'error' | 'skipped' | 'unconfigured';
  };
  aiQueue: {
    mode: 'queue' | 'inline-fallback';
  };
}

// Track process start time for uptime reporting
const START_TIME = Date.now();

async function checkSupabase(): Promise<{
  status: 'ok' | 'error' | 'skipped';
  latencyMs?: number;
}> {
  if (!supabase) {
    return { status: 'skipped' };
  }

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH.SUPABASE_PING_TIMEOUT_MS);

  try {
    const { error } = await supabase.from('user_preferences').select('user_id').limit(1);
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);

    if (error) {
      console.error('[Health] Supabase query failed:', error.message);
      return { status: 'error', latencyMs: latency };
    }
    return { status: 'ok', latencyMs: latency };
  } catch (e) {
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);
    console.error('[Health] Supabase unreachable:', e instanceof Error ? e.message : String(e));
    return { status: 'error', latencyMs: latency };
  }
}

async function checkRedis(): Promise<'ok' | 'error' | 'skipped' | 'unconfigured'> {
  try {
    const available = await isRedisAvailable();
    return available ? 'ok' : 'unconfigured';
  } catch (e) {
    console.error('[Health] Redis check failed:', e instanceof Error ? e.message : String(e));
    return 'error';
  }
}

export async function GET() {
  const [supabaseCheck, redisCheck] = await Promise.all([
    checkSupabase(),
    checkRedis(),
  ]);

  // Overall status: ok only if all non-skipped checks are ok
  const activeChecks = [supabaseCheck.status].filter((s): s is 'ok' | 'error' => s !== 'skipped');
  const hasErrors = activeChecks.includes('error');
  const overallStatus: HealthStatus['status'] = hasErrors ? 'degraded' : 'ok';

  const aiQueueMode: HealthStatus['aiQueue']['mode'] =
    redisCheck === 'ok' ? 'queue' : 'inline-fallback';

  const status: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
    checks: {
      supabase: supabaseCheck.status,
      supabaseLatencyMs: supabaseCheck.latencyMs,
      redis: redisCheck,
    },
    aiQueue: {
      mode: aiQueueMode,
    },
  };

  const httpStatus = (overallStatus as HealthStatus['status']) === 'error' ? 503 : 200;

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/health+json',
    },
  });
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/config';
import { HEALTH } from '@/lib/constants';

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
    // Simple lightweight query — just check if we can reach the DB
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

export async function GET() {
  const supabaseCheck = await checkSupabase();

  const overallStatus: HealthStatus['status'] =
    supabaseCheck.status === 'error' ? 'degraded' : 'ok';

  const status: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
    checks: {
      supabase: supabaseCheck.status,
      supabaseLatencyMs: supabaseCheck.latencyMs,
    },
  };

  const httpStatus = overallStatus === 'error' ? 503 : overallStatus === 'degraded' ? 200 : 200;

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/health+json',
    },
  });
}

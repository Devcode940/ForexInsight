'use server';

import { z } from 'zod';
import { supabase } from '@/lib/supabase/config';
import { checkRateLimit } from '@/lib/rate-limit';

// --- Validation ---
const FinnhubKeySchema = z
  .string()
  .trim()
  .max(100, 'Key too long')
  .regex(/^[a-zA-Z0-9]+$/, 'Invalid Finnhub key format')
  .optional()
  .or(z.literal(''));

const AlphaVantageKeySchema = z
  .string()
  .trim()
  .max(100, 'Key too long')
  .regex(/^[a-zA-Z0-9]+$/, 'Invalid Alpha Vantage key format')
  .optional()
  .or(z.literal(''));

const SaveApiKeysSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  finnhubApiKey: FinnhubKeySchema,
  alphavantageApiKey: AlphaVantageKeySchema,
});

// --- Rate limit config ---
const RATE_LIMIT_MAX = 5; // 5 saves
const RATE_LIMIT_WINDOW_MS = 60_000; // per minute per user

// --- Sanitization helpers ---

/**
 * Strip any characters that don't belong in API keys.
 * Even though Zod validates format, this provides defense in depth.
 */
function sanitizeApiKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Keep only alphanumerics — all supported providers use these
  return raw.replace(/[^a-zA-Z0-9]/g, '') || undefined;
}

// --- Server Action ---

export interface SaveApiKeysResult {
  success: boolean;
  message: string;
  rateLimit?: { remaining: number; resetAt: number };
}

/**
 * Securely persist API keys to the authenticated user's preferences row.
 *
 * SECURITY:
 * - Requires a valid UUID user ID (must come from server-side auth, not client input)
 * - Validates key format with Zod
 * - Sanitizes input (defense in depth)
 * - Rate limited per user
 * - Keys stored in RLS-protected table (user can only access their own row)
 */
export async function saveUserApiKeys(
  userId: string,
  keys: { finnhubApiKey?: string; alphavantageApiKey?: string }
): Promise<SaveApiKeysResult> {
  // 1. Rate limit
  const rl = checkRateLimit({
    key: `save-api-keys:${userId}`,
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!rl.allowed) {
    const retrySec = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return {
      success: false,
      message: `Rate limit exceeded. Try again in ${retrySec}s.`,
      rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
    };
  }

  // 2. Validate
  const parseResult = SaveApiKeysSchema.safeParse({
    userId,
    finnhubApiKey: keys.finnhubApiKey,
    alphavantageApiKey: keys.alphavantageApiKey,
  });

  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => i.message).join('; ');
    return {
      success: false,
      message: `Invalid input: ${issues}`,
      rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
    };
  }

  // 3. Sanitize (defense in depth)
  const cleanFinnhub = sanitizeApiKey(parseResult.data.finnhubApiKey);
  const cleanAlpha = sanitizeApiKey(parseResult.data.alphavantageApiKey);

  // 4. DB check
  if (!supabase) {
    return {
      success: false,
      message: 'Database not configured.',
      rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
    };
  }

  // 5. Persist
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        finnhub_api_key: cleanFinnhub ?? null,
        alphavantage_api_key: cleanAlpha ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[saveUserApiKeys] DB error:', error.message);
    return {
      success: false,
      message: 'Failed to save keys. Please try again.',
      rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
    };
  }

  return {
    success: true,
    message: 'API keys saved securely.',
    rateLimit: { remaining: rl.remaining, resetAt: rl.resetAt },
  };
}

/**
 * Server action to retrieve the current user's API keys.
 * Only returns presence flags, not the actual keys, for client-side display.
 * (The actual keys are used only server-side in market-data actions.)
 */
export async function getUserApiKeyPresence(userId: string): Promise<{
  finnhub: boolean;
  alphavantage: boolean;
}> {
  if (!supabase) return { finnhub: false, alphavantage: false };

  const { data, error } = await supabase
    .from('user_preferences')
    .select('finnhub_api_key, alphavantage_api_key')
    .eq('user_id', userId)
    .single();

  if (error || !data) return { finnhub: false, alphavantage: false };

  return {
    finnhub: Boolean(data.finnhub_api_key),
    alphavantage: Boolean(data.alphavantage_api_key),
  };
}

/**
 * Input sanitization utilities for user-provided text.
 *
 * Defense in depth: even though LLMs are the final consumer, we still
 * strip/neutralize patterns that could be used for prompt injection,
 * XSS, or log injection.
 */

// Patterns that suggest prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions|directives|commands)/gi,
  /disregard\s+(any|previous|all)\s+(instructions|content)/gi,
  /you\s+are\s+(now|no\s+longer)\s+/gi,
  /system\s*prompt[:=]/gi,
  /<\/?[a-z][\s\S]*>/gi, // HTML tags — strip them
  /javascript\s*:/gi,
  /on\w+\s*=/gi, // inline event handlers
];

// Characters used for log injection (newlines, control chars)
const LOG_INJECTION_PATTERN = /[\r\n\t\f\b\x00-\x1f\x7f]/g;

/**
 * Maximum safe length for custom AI instructions.
 * Long inputs can be used for token-exhaustion attacks.
 */
export const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 500;

export interface SanitizeResult {
  clean: string;
  warnings: string[];
  truncated: boolean;
}

/**
 * Sanitize user-provided custom AI instructions.
 *
 * - Truncates to safe length
 * - Strips HTML tags and obvious prompt-injection patterns
 * - Normalizes whitespace
 * - Returns warnings about what was removed (for transparency/logging)
 */
export function sanitizeCustomInstructions(raw: string): SanitizeResult {
  const warnings: string[] = [];
  let text = raw ?? '';

  // 1. Truncate to safe length
  let truncated = false;
  if (text.length > MAX_CUSTOM_INSTRUCTIONS_LENGTH) {
    text = text.slice(0, MAX_CUSTOM_INSTRUCTIONS_LENGTH);
    truncated = true;
    warnings.push(`Truncated to ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters`);
  }

  // 2. Strip dangerous patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      const before = text.length;
      text = text.replace(pattern, ' ');
      if (text.length !== before) {
        warnings.push('Removed potentially unsafe content patterns');
      }
    }
    pattern.lastIndex = 0; // reset regex state
  }

  // 3. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return { clean: text, warnings, truncated };
}

/**
 * Sanitize text for safe logging — strip newlines and control characters
 * to prevent log injection / log forging attacks.
 */
export function sanitizeForLog(raw: string): string {
  if (!raw) return '';
  return raw.replace(LOG_INJECTION_PATTERN, ' ').slice(0, 1000);
}

/**
 * Validate a currency pair symbol format.
 * Accepts: standard 6-char forex pairs (EURUSD), metals (XAUUSD),
 * and Yahoo-style suffixes (EURUSD=X, GC=F).
 */
export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9]{3,12}(?:=[XF])?$/.test(symbol);
}

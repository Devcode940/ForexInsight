/**
 * Feature flag utilities for safe, gradual rollouts.
 *
 * Flags are driven by environment variables with sensible defaults.
 * In development, you can toggle flags by setting env vars or by
 * calling the override functions below (browser only, for QA/testing).
 */
import { FEATURE_FLAGS as EnvFlags } from '@/lib/constants';

export type FeatureKey = keyof typeof EnvFlags;

// Browser-side overrides (for QA / testing only)
const browserOverrides = new Map<FeatureKey, boolean>();

/**
 * Check if a feature is enabled.
 * Respects browser-side overrides first (if in a browser),
 * then falls back to the environment-driven constant.
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  if (typeof window !== 'undefined') {
    const override = browserOverrides.get(key);
    if (override !== undefined) return override;
  }
  return EnvFlags[key];
}

/**
 * Override a feature flag in the current browser session.
 * Used for QA / demo purposes only. Does not persist across reloads.
 */
export function overrideFeature(key: FeatureKey, enabled: boolean): void {
  if (typeof window !== 'undefined') {
    browserOverrides.set(key, enabled);
  }
}

/** Clear all browser-side feature flag overrides. */
export function clearFeatureOverrides(): void {
  browserOverrides.clear();
}

/** Get a snapshot of all current feature flag states. */
export function getAllFeatureStates(): Record<FeatureKey, boolean> {
  const entries = (Object.keys(EnvFlags) as FeatureKey[]).map((key) => [
    key,
    isFeatureEnabled(key),
  ]);
  return Object.fromEntries(entries) as Record<FeatureKey, boolean>;
}

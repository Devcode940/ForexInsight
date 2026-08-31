/**
 * Centralized application constants.
 *
 * All magic numbers, timeout values, limits, and configuration defaults
 * live here. This makes it easy to tune system behavior without hunting
 * through component files.
 */

// --- Market Data ---
export const MARKET_DATA = {
  /** Number of days of historical candles to fetch */
  LOOKBACK_DAYS: 7,
  /** Milliseconds before external API calls abort */
  REQUEST_TIMEOUT_MS: 10_000,
  /** Maximum candles to return from any single fetch */
  MAX_CANDLES_PER_FETCH: 1000,
  /** Maximum candles to keep in memory for the chart */
  MAX_CANDLES_MEMORY: 500,
  /** Milliseconds between Yahoo Finance polling updates */
  POLLING_INTERVAL_MS: 15_000,
  /** Number of mock candles to generate in simulation mode */
  MOCK_CANDLE_COUNT: 150,
} as const;

// --- AI Analysis ---
export const AI_ANALYSIS = {
  /** Minimum candles required to run a meaningful analysis */
  MIN_CANDLES_REQUIRED: 10,
  /** Milliseconds cooldown between AI analysis requests (client-side) */
  COOLDOWN_MS: 5_000,
  /** Maximum candles to send to the LLM (token budget) */
  MAX_CANDLES_FOR_LLM: 100,
  /** Maximum signal history items to keep in memory/storage */
  MAX_HISTORY_ITEMS: 20,
  /** Maximum text length for TTS generation */
  MAX_TTS_TEXT_LENGTH: 2000,
} as const;

// --- WebSocket ---
export const WEBSOCKET = {
  /** Initial delay before first reconnection attempt (ms) */
  INITIAL_RECONNECT_DELAY_MS: 3_000,
  /** Maximum reconnection delay (exponential backoff cap) */
  MAX_RECONNECT_DELAY_MS: 30_000,
} as const;

// --- Indicator Defaults ---
export const INDICATORS = {
  SMA: { period: 20, color: '#3A86FF' },
  EMA: { period: 50, color: '#FFBE0B' },
  RSI: { period: 14, color: '#9D4EDD' },
  MACD: { fast: 12, slow: 26, signal: 9 },
} as const;

// --- UI ---
export const UI = {
  /** Default currency pair on first load */
  DEFAULT_PAIR: 'EURUSD',
  /** Default timeframe on first load */
  DEFAULT_TIMEFRAME: '1H',
  /** Available timeframes */
  TIMEFRAMES: ['1m', '5m', '15m', '30m', '1H', 'D'] as const,
} as const;

// --- Position Calculator ---
export const POSITION_CALC = {
  DEFAULT_BALANCE: 10000,
  DEFAULT_RISK_PERCENT: 1,
  DEFAULT_STOP_LOSS_PIPS: 30,
  /** Pip value per standard lot for non-JPY pairs (USD) */
  PIP_VALUE_STANDARD_USD: 10.0,
  /** Pip value per standard lot for JPY pairs */
  PIP_VALUE_STANDARD_JPY: 6.7,
} as const;

// --- Storage Keys ---
export const STORAGE_KEYS = {
  SESSION_HISTORY: 'fx_session_history',
  MARKET_PROVIDER: 'market_provider',
  FINNHUB_KEY: 'finnhub_api_key',
  ALPHAVANTAGE_KEY: 'alphavantage_api_key',
} as const;

// --- Feature Flags ---
// These are environment-driven toggles for safe rollouts.
// Set to 'true' in the environment to enable, or leave unset to disable.
export const FEATURE_FLAGS = {
  /** Enable AI multi-timeframe analysis */
  AI_ANALYSIS_ENABLED: process.env.FEATURE_AI_ANALYSIS !== 'false',
  /** Enable TTS voice synthesis */
  TTS_ENABLED: process.env.FEATURE_TTS !== 'false',
  /** Enable real-time WebSocket streaming */
  WEBSOCKET_ENABLED: process.env.FEATURE_WEBSOCKET !== 'false',
  /** Enable authenticated user preference persistence */
  USER_PERSISTENCE_ENABLED: process.env.FEATURE_USER_PERSISTENCE !== 'false',
  /** Enable candlestick pattern recognition AI flow */
  PATTERN_RECOGNITION_ENABLED: process.env.FEATURE_PATTERN_RECOGNITION !== 'false',
} as const;

// --- Health Check ---
export const HEALTH = {
  /** How often to refresh internal health state (ms) */
  CHECK_INTERVAL_MS: 30_000,
  /** Supabase ping timeout for health check (ms) */
  SUPABASE_PING_TIMEOUT_MS: 3_000,
} as const;

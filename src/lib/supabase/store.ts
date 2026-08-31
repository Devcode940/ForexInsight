import { supabase } from "./config";
import { IndicatorsState } from "@/components/indicator-settings-sidebar";
import { ExplainableTradeSignalsOutput } from "@/ai/flows/explainable-trade-signals";

export interface UserPreferences {
  activePair: string;
  activeTimeframe: string;
  indicators: IndicatorsState;
  watchlist: string[];
  customAiInstructions?: string;
  finnhubApiKey?: string;
  alphavantageApiKey?: string;
}

export interface StoredSignal extends ExplainableTradeSignalsOutput {
  userId: string;
  currencyPair: string;
  timeframe: string;
  createdAt: number;
}

function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[SupabaseStore:${context}] ${message}`);
}

export const saveUserPreferences = async (
  userId: string,
  prefs: Partial<UserPreferences>,
): Promise<void> => {
  if (!supabase) {
    logError('saveUserPreferences', new Error('Supabase not configured'));
    return;
  }

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      active_pair: prefs.activePair,
      active_timeframe: prefs.activeTimeframe,
      indicators: prefs.indicators,
      watchlist: prefs.watchlist,
      custom_ai_instructions: prefs.customAiInstructions,
      finnhub_api_key: prefs.finnhubApiKey,
      alphavantage_api_key: prefs.alphavantageApiKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) logError('saveUserPreferences', error);
};

export const getUserPreferences = async (
  userId: string,
): Promise<UserPreferences | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (expected for new users)
      logError('getUserPreferences', error);
    }
    return null;
  }

  return {
    activePair: data.active_pair ?? "",
    activeTimeframe: data.active_timeframe ?? "",
    indicators: data.indicators as IndicatorsState,
    watchlist: data.watchlist ?? [],
    customAiInstructions: data.custom_ai_instructions,
    finnhubApiKey: data.finnhub_api_key,
    alphavantageApiKey: data.alphavantage_api_key,
  };
};

export const saveTradeSignal = async (
  userId: string,
  signal: ExplainableTradeSignalsOutput,
  pair: string,
  tf: string,
): Promise<void> => {
  if (!supabase) {
    logError('saveTradeSignal', new Error('Supabase not configured'));
    return;
  }

  const { error } = await supabase.from("signals").insert({
    user_id: userId,
    currency_pair: pair,
    timeframe: tf,
    direction: signal.direction,
    entry_zone: signal.entryZone,
    stop_loss: String(signal.stopLoss),
    take_profit: String(signal.takeProfit),
    risk_reward_ratio: signal.riskRewardRatio,
    confidence: signal.confidence,
    confluence_factors: signal.confluenceFactors,
    correlation_analysis: signal.correlationAnalysis,
    reasoning: signal.reasoning,
    risk_warning: signal.riskWarning,
    created_at: new Date().toISOString(),
  });

  if (error) logError('saveTradeSignal', error);
};

export const getSignalHistory = async (
  userId: string,
): Promise<StoredSignal[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    logError('getSignalHistory', error ?? new Error('No data returned'));
    return [];
  }

  return data.map((row) => ({
    userId: row.user_id,
    currencyPair: row.currency_pair,
    timeframe: row.timeframe,
    direction: row.direction as 'Bullish' | 'Bearish' | 'Neutral',
    entryZone: row.entry_zone,
    stopLoss: parseFloat(row.stop_loss),
    takeProfit: parseFloat(row.take_profit),
    riskRewardRatio: row.risk_reward_ratio,
    confidence: row.confidence,
    confluenceFactors: row.confluence_factors,
    correlationAnalysis: row.correlation_analysis ?? '',
    reasoning: row.reasoning,
    riskWarning: row.risk_warning,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

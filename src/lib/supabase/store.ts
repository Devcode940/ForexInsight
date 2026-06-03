import { supabase } from "./config";
import { IndicatorsState } from "@/components/indicator-settings-sidebar";
import { ExplainableTradeSignalsOutput } from "@/ai/flows/explainable-trade-signals";

export interface UserPreferences {
  activePair: string;
  activeTimeframe: string;
  indicators: IndicatorsState;
  watchlist: string[];
  customAiInstructions?: string;
}

export interface StoredSignal extends ExplainableTradeSignalsOutput {
  userId: string;
  currencyPair: string;
  timeframe: string;
  createdAt: number;
}

export const saveUserPreferences = async (
  userId: string,
  prefs: Partial<UserPreferences>,
) => {
  if (!supabase) return;
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      active_pair: prefs.activePair,
      active_timeframe: prefs.activeTimeframe,
      indicators: prefs.indicators,
      watchlist: prefs.watchlist,
      custom_ai_instructions: prefs.customAiInstructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("Error saving preferences:", error);
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

  if (error || !data) return null;

  return {
    activePair: data.active_pair ?? "",
    activeTimeframe: data.active_timeframe ?? "",
    indicators: data.indicators as IndicatorsState,
    watchlist: data.watchlist ?? [],
    customAiInstructions: data.custom_ai_instructions,
  };
};

export const saveTradeSignal = async (
  userId: string,
  signal: ExplainableTradeSignalsOutput,
  pair: string,
  tf: string,
) => {
  if (!supabase) return;
  const { error } = await supabase.from("signals").insert({
    user_id: userId,
    currency_pair: pair,
    timeframe: tf,
    direction: signal.direction,
    entry_zone: signal.entryZone,
    stop_loss: signal.stopLoss,
    take_profit: signal.takeProfit,
    risk_reward_ratio: signal.riskRewardRatio,
    confidence: signal.confidence,
    confluence_factors: signal.confluenceFactors,
    reasoning: signal.reasoning,
    risk_warning: signal.riskWarning,
    created_at: new Date().toISOString(),
  });
  if (error) console.error("Error saving signal:", error);
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

  if (error || !data) return [];

  return data.map((row) => ({
    userId: row.user_id,
    currencyPair: row.currency_pair,
    timeframe: row.timeframe,
    direction: row.direction,
    entryZone: row.entry_zone,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    riskRewardRatio: row.risk_reward_ratio,
    confidence: row.confidence,
    confluenceFactors: row.confluence_factors,
    reasoning: row.reasoning,
    riskWarning: row.risk_warning,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

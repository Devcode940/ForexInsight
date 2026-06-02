
import { doc, getDoc, setDoc, collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "./config";
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

export const saveUserPreferences = async (userId: string, prefs: Partial<UserPreferences>) => {
  const userRef = doc(db, "users", userId);
  try {
    await setDoc(userRef, prefs, { merge: true });
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  const userRef = doc(db, "users", userId);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserPreferences;
    }
  } catch (error) {
    console.error("Error getting preferences:", error);
  }
  return null;
};

export const saveTradeSignal = async (userId: string, signal: ExplainableTradeSignalsOutput, pair: string, tf: string) => {
  try {
    const signalsRef = collection(db, "signals");
    await addDoc(signalsRef, {
      ...signal,
      userId,
      currencyPair: pair,
      timeframe: tf,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error saving signal:", error);
  }
};

export const getSignalHistory = async (userId: string): Promise<StoredSignal[]> => {
  try {
    const signalsRef = collection(db, "signals");
    const q = query(
      signalsRef, 
      where("userId", "==", userId), 
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as StoredSignal);
  } catch (error) {
    console.error("Error getting signal history:", error);
    return [];
  }
};

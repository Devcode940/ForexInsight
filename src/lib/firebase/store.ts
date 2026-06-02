
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";
import { IndicatorsState } from "@/components/indicator-settings-sidebar";

export interface UserPreferences {
  activePair: string;
  activeTimeframe: string;
  indicators: IndicatorsState;
  watchlist: string[];
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

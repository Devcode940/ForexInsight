import { supabase } from "./config";
import { User } from "@supabase/supabase-js";

export const signInWithGoogle = async (): Promise<User | null> => {
  if (!supabase) {
    console.error("Supabase not configured");
    return null;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
  return null;
};

export const logOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (
  callback: (user: User | null) => void,
) => {
  if (!supabase) {
    callback(null);
    return () => {};
  }
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
};

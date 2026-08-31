import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Validate configuration at module load time — fail fast in dev,
// return null gracefully in production if misconfigured.
function isValidSupabaseConfig(): boolean {
  if (!supabaseUrl) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL is not configured");
    }
    return false;
  }
  if (!supabaseUrl.startsWith("https://")) {
    console.error("[Supabase] URL must use HTTPS");
    return false;
  }
  if (!supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
    }
    return false;
  }
  return true;
}

export const supabase = isValidSupabaseConfig()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

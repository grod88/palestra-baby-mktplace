import { createClient } from "@supabase/supabase-js";

// Fallback URL for test environment (never used in production)
const FALLBACK_URL = "https://placeholder.supabase.co";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

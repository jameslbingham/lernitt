// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// These values connect your specific "Lernitt" project to the code.
// They must match the "Project URL" and "API Key" in your Supabase Dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- SENIOR DEV HEALTH CHECK ---
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL ERROR: Supabase environment variables are missing! Check Render settings.");
}

// Fixed connection using the exact Version 3 architecture to ensure "fetch" success.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

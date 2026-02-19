// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- SENIOR DEV HEALTH CHECK ---
// If these are blank in your browser console, Render is not "talking" to the app.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL ERROR: Supabase environment variables are missing! Check Render settings.");
}

// Merged configuration: Keeps your session persistence while using the correct keys.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

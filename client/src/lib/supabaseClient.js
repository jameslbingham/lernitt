// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// These pull the "keys" from your project settings automatically
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Senior Dev Check: Warn if keys aren't loading properly
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase keys missing. Check your .env file or Render settings.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

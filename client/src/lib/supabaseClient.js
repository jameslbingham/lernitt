// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This part checks if your settings are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Supabase settings are missing. Please check your Render Dashboard.");
}

// This creates the connection to your image storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // This helps prevent "Failed to fetch" errors in some browsers
  }
});

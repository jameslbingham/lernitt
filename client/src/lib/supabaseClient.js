// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// HARD-CODED FOR TESTING: This removes all "variable" guesswork
const supabaseUrl = "https://xdpecuenksfsdediokqg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcGVjdWVua3Nmc2RlZGlva3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI1MjMsImV4cCI6MjA3OTIwODUyM30.n_jOk9LdIt0ikPz1A4vMWwYxpNA5aGfRYWkDi-kCKX8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

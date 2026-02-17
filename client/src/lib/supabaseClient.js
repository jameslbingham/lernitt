// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// CHANGE: Remove persistSession: false. We NEED the session to persist 
// so the storage bucket knows who is uploading.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

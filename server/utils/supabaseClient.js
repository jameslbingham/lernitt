// server/utils/supabaseClient.js
/**
 * LERNITT ACADEMY - SUPABASE INFRASTRUCTURE CLIENT
 * ----------------------------------------------------------------------------
 * VERSION: 2.1.0
 * FEATURES: 
 * - Service Role Prioritization: Ensures backend has bypass permissions for storage.
 * - Flat Path Compatibility: Configured for tutor-avatars and tutor-videos buckets.
 * - Fail-safe initialization: Prevents server crashes if env vars are missing.
 * ----------------------------------------------------------------------------
 */

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;

/**
 * SECURITY LOGIC:
 * We prioritize the SERVICE_ROLE_KEY for backend operations. 
 * This allows the server to upload videos to buckets even if public write is disabled.
 */
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase;

// ✅ If Supabase is not configured locally, provide a safe dummy to prevent crashes
if (!url || !key || !url.startsWith("http")) {
  console.warn("⚠️  SUPABASE WARNING: Credentials missing or invalid. Storage features will be disabled.");
  
  // Dummy object to prevent 'undefined' errors elsewhere in the code
  supabase = {
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error("Supabase not configured") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } })
      })
    }
  };
} else {
  // Initialize the real client
  supabase = createClient(url, key);
}

module.exports = { supabase };

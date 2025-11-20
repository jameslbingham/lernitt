// /server/utils/supabaseClient.js
// ===============================================================
// Central Supabase client for ALL server-side Supabase access.
// Used for: file uploads (recordings, avatars, etc.).
// Requires @supabase/supabase-js v1.x (CommonJS compatible).
// ===============================================================

const { createClient } = require("@supabase/supabase-js");

// These MUST be set in Render environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety check – logs a warning if env vars missing (but does not crash)
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. " +
      "Supabase uploads will NOT work until these are set."
  );
}

// Create a single shared Supabase client for the whole server
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Export the client. Other files can:
//   const supabase = require('../utils/supabaseClient');
module.exports = supabase;

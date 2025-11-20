// /server/utils/supabaseClient.js
// ===============================================================
// Central Supabase client for ALL server-side Supabase access.
// This version is 100% CommonJS and fully compatible with your server.
// ===============================================================

const { createClient } = require("@supabase/supabase-js");

// Required env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Warning only — does NOT crash server
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — Supabase uploads will not work."
  );
}

// Create shared client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = supabase;

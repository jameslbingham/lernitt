// server/utils/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

// ✅ If Supabase is not configured locally, return a safe dummy client
if (!url || !key || !url.startsWith("http")) {
  console.warn("Supabase disabled locally.");
  module.exports = null;
} else {
  module.exports = createClient(url, key);
}

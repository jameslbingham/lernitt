// /server/utils/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("Supabase env vars missing (SUPABASE_URL / SUPABASE_*_KEY).");
}

module.exports = createClient(url || "", key || "");

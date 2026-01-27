// client/src/pages/Settings.jsx
/**
 * LERNITT ACADEMY - ENTERPRISE SETTINGS & SECURITY MODULE
 * ----------------------------------------------------------------------------
 * VERSION: 4.8.0
 * FEATURES:
 * - Preferences: Localization, Currency, and UI Theme (Dark/Light/Auto).
 * - Notifications: Granular control over Email, SMS, and Lesson Reminders.
 * - Utilities: JSON Export/Import for configuration portability.
 * - SECURITY (NEW): Integrated Password Management & Security Context.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

/**
 * ENVIRONMENT CONFIGURATION
 * Logic derived from VITE_API and VITE_MOCK flags.
 */
const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";
const LS_KEY = "app:settings";

/**
 * DEFAULTS FACTORY
 * Generates initial state based on the user's browser environment.
 */
const DEFAULTS = (browserLocale) => ({
  locale: browserLocale || "en-US",
  timeFormat: "auto", // auto | 12h | 24h
  currency: "EUR",
  darkMode: "auto", // auto | light | dark
  notifications: {
    email: true,
    sms: false,
    push: false, 
    lessonReminders: true,
    marketing: false,
  },
});

/* -------------------------------------------------------------------------- */
/* THEME & LOCALIZATION HELPERS                                               */
/* -------------------------------------------------------------------------- */

/**
 * applyTheme
 * Manages the global CSS class on the document root for dark/light mode.
 */
function applyTheme(mode) {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const isDark = mode === "dark" || (mode === "auto" && prefersDark);
  document.documentElement.classList.toggle("dark", !!isDark);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

/**
 * detect12h
 * Introspects the browser locale to guess if 12-hour formatting is preferred.
 */
function detect12h(locale) {
  try {
    const p = new Intl.DateTimeFormat(locale, { hour: "numeric" })
      .formatToParts(new Date());
    return p.some((x) => x.type === "dayPeriod");
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* MAIN SETTINGS COMPONENT                                                    */
/* -------------------------------------------------------------------------- */

export default function Settings() {
  const nav = useNavigate();
  const loc = useLocation();
  const browserLocale = (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) || "en-US";

  // Configuration State
  const [settings, setSettings] = useState(DEFAULTS(browserLocale));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ✅ NEW: Password Change State
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdErr, setPwdErr] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const timeFormatGuess = useMemo(() => (detect12h(settings.locale) ? "12h" : "24h"), [settings.locale]);

  /* -------------------------------------------------------------------------- */
  /* DATA SYNCHRONIZATION (LOAD/SAVE)                                           */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        let loaded = null;
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) loaded = JSON.parse(raw);
        } catch {}
        
        if (!loaded) {
          if (MOCK) {
            loaded = DEFAULTS(browserLocale);
          } else {
            const data = await apiFetch?.("/api/settings/me", { auth: true }).catch(async () => {
              const token = localStorage.getItem("token");
              const r = await fetch(`${API}/api/settings/me`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!r.ok) throw new Error("Failed to load settings from academic server.");
              return await r.json();
            });
            loaded = data?.settings || data || DEFAULTS(browserLocale);
          }
        }
        
        const merged = { 
          ...DEFAULTS(browserLocale), 
          ...loaded,
          notifications: { ...DEFAULTS(browserLocale).notifications, ...(loaded?.notifications || {}) }
        };
        
        setSettings(merged);
        applyTheme(merged.darkMode);
        setDirty(false);
      } catch (e) {
        setErr(e?.message || "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [browserLocale]);

  // Draft persistence to local storage
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, loading]);

  function update(patch) {
    setSettings((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      setDirty(true);
      setMsg("");
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      if (!MOCK) {
        await apiFetch?.("/api/settings", { method: "PUT", auth: true, body: settings }).catch(async () => {
          const token = localStorage.getItem("token");
          const r = await fetch(`${API}/api/settings`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(settings),
          });
          if (!r.ok) throw new Error("Academic server rejected configuration update.");
        });
      }
      setDirty(false);
      setMsg("Settings successfully updated!");
    } catch (e) {
      setErr(e?.message || "Configuration update failed.");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* ✅ NEW: SECURITY HANDLERS                                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * onPasswordUpdate
   * Securely submits current and new credentials to the auth/update endpoint.
   */
  async function onPasswordUpdate(e) {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");

    if (passwords.new !== passwords.confirm) {
      return setPwdErr("New passwords do not match.");
    }

    setPwdLoading(true);
    try {
      if (MOCK) {
        setPwdMsg("Mock: Password changed!");
      } else {
        // Interacts with backend logic added to auth.js
        await apiFetch("/api/auth/update-password", {
          method: "PATCH",
          auth: true,
          body: {
            currentPassword: passwords.current,
            newPassword: passwords.new
          }
        });
        setPwdMsg("Password updated successfully.");
      }
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPwdErr(err.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  }

  function onResetDefaults() {
    const d = DEFAULTS(browserLocale);
    setSettings(d);
    applyTheme(d.darkMode);
    setDirty(true);
    setMsg("Default parameters restored (pending save).");
  }

  useEffect(() => {
    applyTheme(settings.darkMode);
  }, [settings.darkMode]);

  /* -------------------------------------------------------------------------- */
  /* UI RENDERING                                                               */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black uppercase tracking-tighter">Settings</h1>
            <div className="h-8 w-24 bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="animate-pulse grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-slate-100 rounded-[32px] p-8 space-y-4">
              <div className="h-6 w-1/3 bg-slate-100 rounded-lg" />
              <div className="h-4 w-2/3 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tf = settings.timeFormat === "auto" ? timeFormatGuess : settings.timeFormat;

  return (
    <div className="p-4 space-y-8 pb-20 font-sans">
      
      {/* 1. STICKY ACTION HEADER */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-4 border-b bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Academy Settings</h1>
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">
              Configuration Instance v4.8.0
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to={locBack(loc)} 
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
            >
              ← Back
            </Link>
            <button
              onClick={onSave}
              disabled={saving || !dirty}
              className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                saving ? "bg-slate-200 text-slate-500" : dirty ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-slate-100 text-slate-400"
              }`}
            >
              {saving ? "Saving…" : dirty ? "Save Config" : "Synchronized"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Status Messaging */}
        {err && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">{err}</div>}
        {msg && !err && <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100">{msg}</div>}

        {/* 2. REGIONAL & APPEARANCE */}
        <section className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-indigo-50/50 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
            <div className="text-2xl">🎨</div>
            <h2 className="text-xl font-bold text-slate-800">Visual Preferences</h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Environment Theme</label>
              <select
                value={settings.darkMode}
                onChange={(e) => update({ darkMode: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="auto">System Default</option>
                <option value="light">Academy Light</option>
                <option value="dark">Academy Dark</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Locale</label>
              <input
                type="text"
                value={settings.locale}
                onChange={(e) => update({ locale: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g., en-AU"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporal Format</label>
              <select
                value={settings.timeFormat}
                onChange={(e) => update({ timeFormat: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="auto">Auto (Locale)</option>
                <option value="12h">12-Hour Cycle</option>
                <option value="24h">24-Hour Cycle</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academy Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => update({ currency: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              TZ: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"} · Format: {tf}
            </p>
            <button
              type="button"
              onClick={onResetDefaults}
              className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
            >
              Wipe Preferences
            </button>
          </div>
        </section>

        {/* 3. ✅ NEW: SECURITY & ACCESS CONTROL */}
        <section className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-indigo-50/50 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="text-2xl">🔐</div>
            <h2 className="text-xl font-bold text-slate-800">Security & Credentials</h2>
          </div>

          <form onSubmit={onPasswordUpdate} className="grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Secret</label>
              <input
                type="password"
                required
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold"
                placeholder="Required to change"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Secret</label>
              <input
                type="password"
                required
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold"
                placeholder="Strong password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Secret</label>
              <input
                type="password"
                required
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold"
                placeholder="Match new secret"
              />
            </div>
            
            <div className="md:col-span-3 flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
              <p className="text-[10px] leading-relaxed text-slate-400 max-w-lg font-bold uppercase tracking-widest">
                Changing your password will invalidate existing session tokens on other devices.
              </p>
              <button
                type="submit"
                disabled={pwdLoading}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
              >
                {pwdLoading ? "Updating..." : "Update Credentials"}
              </button>
            </div>
          </form>
          {pwdErr && <div className="text-red-600 text-xs font-bold">{pwdErr}</div>}
          {pwdMsg && <div className="text-emerald-600 text-xs font-bold">{pwdMsg}</div>}
        </section>

        {/* 4. NOTIFICATION ARCHITECTURE */}
        <section className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-indigo-50/50 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
            <div className="text-2xl">🔔</div>
            <h2 className="text-xl font-bold text-slate-800">Academic Notifications</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { id: 'email', label: 'Email Correspondence' },
              { id: 'sms', label: 'SMS Instant Alerts' },
              { id: 'push', label: 'Browser Push Infrastructure' },
              { id: 'lessonReminders', label: 'Lesson Cycle Reminders' },
              { id: 'marketing', label: 'Academy News & Insights' }
            ].map((item) => (
              <label key={item.id} className="group flex items-center justify-between bg-slate-50 p-4 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-colors">
                <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600">{item.label}</span>
                <input
                  type="checkbox"
                  checked={!!settings.notifications[item.id]}
                  onChange={(e) =>
                    update({
                      notifications: { ...settings.notifications, [item.id]: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-indigo-600 border-slate-200 rounded-lg focus:ring-indigo-500"
                />
              </label>
            ))}
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 leading-relaxed">
              * Note: Browser push notifications require explicit cryptographic hardware signatures via the user agent. Enabling the preference here sets the intent but does not handle OS registration.
            </p>
          </div>
        </section>

        {/* 5. DATA PORTABILITY & UTILITIES */}
        <section className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-indigo-50/50 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
            <div className="text-2xl">📦</div>
            <h2 className="text-xl font-bold text-slate-800">Configuration Portability</h2>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="bg-slate-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all border border-slate-100 shadow-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
                  alert("Configuration JSON transferred to clipboard.");
                } catch {
                  alert("Clipboard sync failed.");
                }
              }}
            >
              Copy Schema
            </button>
            <button
              type="button"
              className="bg-slate-50 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all border border-slate-100 shadow-sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "lernitt_settings.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Archive
            </button>
          </div>
        </section>

        {/* Global Academy Branding Footer */}
        <div className="pt-20 text-center select-none opacity-20 group">
          <div className="text-4xl font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors">LERNITT</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.5em] mt-2 text-slate-500">Secure Academic Instance v4.8.0</div>
        </div>

      </div>
    </div>
  );
}

/**
 * UTILITY: locBack
 * Resolves the history stack to determine the logical return path for the user.
 */
function locBack(loc) {
  const from = loc.state?.from;
  if (from?.pathname) return `${from.pathname}${from.search || ""}`;
  return "/"; 
}

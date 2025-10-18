// client/src/pages/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/apiFetch.js";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const MOCK = import.meta.env.VITE_MOCK === "1";
const LS_KEY = "app:settings";

const DEFAULTS = (browserLocale) => ({
  locale: browserLocale || "en-US",
  timeFormat: "auto", // auto | 12h | 24h
  currency: "EUR",
  darkMode: "auto", // auto | light | dark
  notifications: {
    email: true,
    sms: false,
    push: false, // UI only (no real web-push registration here)
    lessonReminders: true,
    marketing: false,
  },
});

/* -------------------- helpers -------------------- */

function applyTheme(mode) {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const isDark = mode === "dark" || (mode === "auto" && prefersDark);
  document.documentElement.classList.toggle("dark", !!isDark);
  // (Optionally) set a data-theme if your CSS reads it:
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

function detect12h(locale) {
  try {
    const p = new Intl.DateTimeFormat(locale, { hour: "numeric" })
      .formatToParts(new Date());
    return p.some((x) => x.type === "dayPeriod");
  } catch {
    return false;
  }
}

/* -------------------- page -------------------- */

export default function Settings() {
  const nav = useNavigate();
  const loc = useLocation();
  const browserLocale = (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) || "en-US";

  const [settings, setSettings] = useState(DEFAULTS(browserLocale));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const timeFormatGuess = useMemo(() => (detect12h(settings.locale) ? "12h" : "24h"), [settings.locale]);

  // Load
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // Try LS first (quick), then server
        let loaded = null;
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) loaded = JSON.parse(raw);
        } catch {}
        if (!loaded) {
          if (MOCK) {
            // nothing on server; use defaults
            loaded = DEFAULTS(browserLocale);
          } else {
            // Accept either {settings:{...}} or the object directly
            const data = await apiFetch?.("/api/settings/me", { auth: true }).catch(async () => {
              // fallback to raw fetch if apiFetch not present in some builds
              const token = localStorage.getItem("token");
              const r = await fetch(`${API}/api/settings/me`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!r.ok) throw new Error("Failed to load settings");
              return await r.json();
            });
            loaded = data?.settings || data || DEFAULTS(browserLocale);
          }
        }
        // Gentle merge with defaults to survive backend changes
        const merged = { ...DEFAULTS(browserLocale), ...loaded,
          notifications: { ...DEFAULTS(browserLocale).notifications, ...(loaded?.notifications || {}) }
        };
        setSettings(merged);
        applyTheme(merged.darkMode);
        setDirty(false);
        setMsg("");
      } catch (e) {
        setErr(e?.message || "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [browserLocale]);

  // Persist to localStorage whenever settings change (draft)
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
      if (MOCK) {
        // Already in LS; just confirm
      } else {
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
          if (!r.ok) throw new Error("Save failed");
        });
      }
      setDirty(false);
      setMsg("Saved!");
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function onResetDefaults() {
    const d = DEFAULTS(browserLocale);
    setSettings(d);
    applyTheme(d.darkMode);
    setDirty(true);
    setMsg("Defaults restored (not saved yet).");
  }

  // Apply theme live when toggled
  useEffect(() => {
    applyTheme(settings.darkMode);
  }, [settings.darkMode]);

  /* -------------------- UI -------------------- */

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex gap-2">
              <button className="border px-3 py-1 rounded-2xl text-sm" disabled>Saving…</button>
            </div>
          </div>
        </div>
        <div className="animate-pulse grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-2xl p-4 space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-72 bg-gray-200 rounded" />
              <div className="h-3 w-40 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tf = settings.timeFormat === "auto" ? timeFormatGuess : settings.timeFormat;

  return (
    <div className="p-4 space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <div className="flex gap-2">
            <Link to={locBack(loc)} className="text-sm underline">← Back</Link>
            <button
              onClick={onSave}
              disabled={saving || !dirty}
              className="border px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow-md transition disabled:opacity-60"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
        <div
          className="mt-2"
          style={{ padding: "6px 8px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#eff6ff" }}
        >
          Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"} · Effective time format: <b>{tf}</b>
        </div>
      </div>

      {err && <div className="text-red-600">{err}</div>}
      {msg && !err && <div className="text-green-700">{msg}</div>}

      {/* Appearance */}
      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <div className="mb-1">Theme</div>
            <select
              value={settings.darkMode}
              onChange={(e) => update({ darkMode: e.target.value })}
              className="border rounded-xl px-2 py-1 w-full"
              aria-label="Theme"
            >
              <option value="auto">Auto (match system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1">Locale</div>
            <input
              type="text"
              value={settings.locale}
              onChange={(e) => update({ locale: e.target.value })}
              className="border rounded-xl px-2 py-1 w-full"
              aria-label="Locale (e.g., en-US, de-DE)"
              placeholder="e.g., en-US"
            />
            <div className="text-xs opacity-70 mt-1">
              Examples: en-US, en-GB, de-DE, es-ES, fr-FR…
            </div>
          </label>

          <label className="text-sm">
            <div className="mb-1">Time format</div>
            <select
              value={settings.timeFormat}
              onChange={(e) => update({ timeFormat: e.target.value })}
              className="border rounded-xl px-2 py-1 w-full"
              aria-label="Time format"
            >
              <option value="auto">Auto (based on locale)</option>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1">Currency</div>
            <select
              value={settings.currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="border rounded-xl px-2 py-1 w-full"
              aria-label="Currency"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="PLN">PLN (zł)</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResetDefaults}
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            Reset to defaults
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.notifications.email}
              onChange={(e) =>
                update({
                  notifications: { ...settings.notifications, email: e.target.checked },
                })
              }
            />
            Email updates
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.notifications.sms}
              onChange={(e) =>
                update({
                  notifications: { ...settings.notifications, sms: e.target.checked },
                })
              }
            />
            SMS alerts
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.notifications.push}
              onChange={(e) =>
                update({
                  notifications: { ...settings.notifications, push: e.target.checked },
                })
              }
            />
            Push (browser) — requires permission
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.notifications.lessonReminders}
              onChange={(e) =>
                update({
                  notifications: { ...settings.notifications, lessonReminders: e.target.checked },
                })
              }
            />
            Lesson reminders
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!settings.notifications.marketing}
              onChange={(e) =>
                update({
                  notifications: { ...settings.notifications, marketing: e.target.checked },
                })
              }
            />
            Product updates & tips
          </label>
        </div>

        <div className="text-xs opacity-70">
          Note: Enabling push will only save your preference here. Actual push subscription/permissions must be handled separately.
        </div>
      </section>

      {/* Utilities */}
      <section className="border rounded-2xl p-4 space-y-2">
        <h2 className="text-lg font-semibold">Utilities</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
                alert("Settings JSON copied!");
              } catch {
                alert("Copy failed");
              }
            }}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="text-sm border px-3 py-1 rounded-2xl shadow-sm hover:shadow-md transition"
            onClick={() => {
              const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "settings.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export JSON
          </button>
        </div>
      </section>
    </div>
  );
}

/* -------------------- tiny helper -------------------- */
function locBack(loc) {
  // Try to go back to where the user came from (if present), else home
  const from = loc.state?.from;
  if (from?.pathname) return `${from.pathname}${from.search || ""}`;
  return "/"; // adjust if you have a better default
}

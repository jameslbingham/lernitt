// Per-tab table/view prefs
const PREFS_KEY = "adminDashboard.prefs.v1";

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}
function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function getTabPrefs(tab) {
  const p = loadPrefs();
  return p[tab] || {};
}

export function setTabPrefs(tab, patch) {
  const p = loadPrefs();
  p[tab] = { ...(p[tab] || {}), ...patch };
  savePrefs(p);
}

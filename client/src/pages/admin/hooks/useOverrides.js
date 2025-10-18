// Admin overrides (persisted in localStorage)
const OVERRIDES_KEY = "adminDashboard.overrides.v1";

function initOverridesShape() {
  return { users:{}, tutors:{}, lessons:{}, payouts:{}, refunds:{}, notifications:{}, disputes:{} };
}

export function loadOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "null");
    return o && typeof o === "object" ? { ...initOverridesShape(), ...o } : initOverridesShape();
  } catch {
    return initOverridesShape();
  }
}

export function saveOverrides(o) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
}

export function tabKey(tab) {
  if (tab === "Users") return "users";
  if (tab === "Tutors") return "tutors";
  if (tab === "Lessons") return "lessons";
  if (tab === "Payouts") return "payouts";
  if (tab === "Refunds") return "refunds";
  if (tab === "Notifications") return "notifications";
  if (tab === "Disputes") return "disputes";
  return "users";
}

export function applyOverrides(tab, items) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  return (items || []).map((r) => ({ ...r, ...(ov[key]?.[r.id] || {}) }));
}

export function updateRowOverride(tab, id, patch, setRows) {
  const key = tabKey(tab);
  const ov = loadOverrides();
  ov[key][id] = { ...(ov[key][id] || {}), ...patch };
  saveOverrides(ov);
  setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

// client/src/pages/admin/tabs/TutorsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import AdminTable from "../admin/tabs/AdminTableShim.jsx";

const API = import.meta.env.VITE_API || "http://localhost:5000";
const IS_MOCK = import.meta.env.VITE_MOCK === "1";

/* ----------------------------- safe fetch ----------------------------- */
async function safeFetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const r = await fetch(url, { headers, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    return text ? JSON.parse(text) : { ok: true };
  } catch (e) {
    if (!IS_MOCK) throw e;

    // ---- MOCK ----
    if (url.endsWith("/api/admin/tutors") && (!opts.method || opts.method === "GET")) {
      return {
        items: [
          {
            id: "t1",
            name: "Bob Tutor",
            email: "bob@example.com",
            langs: ["en", "es"],
            rate: 18,
            currency: "USD",
            rating: 4.9,
            lessons: 312,
            status: "approved",
            featured: true,
            verified: true,
            country: "Spain",
            createdAt: "2025-09-01T10:00:00Z",
          },
          {
            id: "t2",
            name: "Dana Coach",
            email: "dana@example.com",
            langs: ["en", "fr"],
            rate: 22,
            currency: "EUR",
            rating: 4.6,
            lessons: 141,
            status: "pending",
            featured: false,
            verified: false,
            country: "France",
            createdAt: "2025-09-27T17:30:00Z",
          },
          {
            id: "t3",
            name: "Kai Mentor",
            email: "kai@example.com",
            langs: ["en", "de"],
            rate: 20,
            currency: "USD",
            rating: 4.8,
            lessons: 205,
            status: "suspended",
            featured: false,
            verified: true,
            country: "Germany",
            createdAt: "2025-08-18T08:00:00Z",
          },
        ],
      };
    }
    return { ok: true };
  }
}

export default function TutorsTab({ rows = [], columns = [], ...rest }) {
  const hasExternalData =
    Array.isArray(rows) && rows.length && Array.isArray(columns) && columns.length;
  if (hasExternalData) {
    return <AdminTable rows={rows} columns={columns} {...rest} />;
  }

  /* ----------------------------- state ----------------------------- */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [lang, setLang] = useState("");
  const [verified, setVerified] = useState("");
  const [featured, setFeatured] = useState("");
  const [minRating, setMinRating] = useState("");
  const [currency, setCurrency] = useState("");
  const [country, setCountry] = useState("");

  const [sort, setSort] = useState({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(null);

  /* ----------------------------- load ----------------------------- */
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await safeFetchJSON(`${API}/api/admin/tutors`);
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(arr);
    } catch (e) {
      setError(e?.message || "Failed to load tutors");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  /* ----------------------------- filters ----------------------------- */
  const languages = useMemo(
    () => Array.from(new Set(items.flatMap((t) => t.langs || []))).sort(),
    [items]
  );
  const currencies = useMemo(
    () => Array.from(new Set(items.map((t) => t.currency).filter(Boolean))).sort(),
    [items]
  );
  const countries = useMemo(
    () => Array.from(new Set(items.map((t) => t.country).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    let arr = items;
    const qq = q.trim().toLowerCase();
    if (qq) arr = arr.filter((t) => JSON.stringify(t).toLowerCase().includes(qq));
    if (status) arr = arr.filter((t) => (t.status || "") === status);
    if (lang) arr = arr.filter((t) => (t.langs || []).includes(lang));
    if (verified) arr = arr.filter((t) => (t.verified ? "yes" : "no") === verified);
    if (featured) arr = arr.filter((t) => (t.featured ? "yes" : "no") === featured);
    if (minRating) arr = arr.filter((t) => Number(t.rating || 0) >= Number(minRating));
    if (currency) arr = arr.filter((t) => (t.currency || "") === currency);
    if (country) arr = arr.filter((t) => (t.country || "").toLowerCase() === country.toLowerCase());
    return arr;
  }, [items, q, status, lang, verified, featured, minRating, currency, country]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const va = a[sort.key],
        vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      if (sort.key.toLowerCase().includes("date") || sort.key.endsWith("At")) {
        return (new Date(va) - new Date(vb)) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page]
  );

  /* ----------------------------- KPIs ----------------------------- */
  const kpi = useMemo(
    () => ({
      total: filtered.length,
      approved: filtered.filter((t) => t.status === "approved").length,
      pending: filtered.filter((t) => t.status === "pending").length,
      suspended: filtered.filter((t) => t.status === "suspended").length,
      avgRating: filtered.length
        ? (filtered.reduce((s, t) => s + (t.rating || 0), 0) / filtered.length).toFixed(2)
        : "0.00",
    }),
    [filtered]
  );

  /* ----------------------------- actions ----------------------------- */
  async function approveTutor(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((t) => (t.id === id ? { ...t, status: "approved" } : t)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/approve`, { method: "POST" });
    await load();
  }
  async function suspendTutor(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((t) => (t.id === id ? { ...t, status: "suspended" } : t)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/suspend`, { method: "POST" });
    await load();
  }
  async function unsuspendTutor(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((t) => (t.id === id ? { ...t, status: "approved" } : t)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/unsuspend`, { method: "POST" });
    await load();
  }
  async function verifyTutor(id) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((t) => (t.id === id ? { ...t, verified: true } : t)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/verify`, { method: "POST" });
    await load();
  }
  async function toggleFeatured(id, next) {
    if (IS_MOCK) {
      setItems((xs) => xs.map((t) => (t.id === id ? { ...t, featured: next } : t)));
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/featured`, {
      method: "PATCH",
      body: JSON.stringify({ featured: next }),
    });
    await load();
  }
  async function setRate(id, rate, currencyCode) {
    const payload = { rate: Number(rate), currency: currencyCode };
    if (IS_MOCK) {
      setItems((xs) =>
        xs.map((t) =>
          t.id === id ? { ...t, rate: Number(rate), currency: currencyCode || t.currency } : t
        )
      );
      return;
    }
    await safeFetchJSON(`${API}/api/admin/tutors/${id}/rate`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await load();
  }

  /* ----------------------------- bulk actions ----------------------------- */
  async function bulkApprove() {
    for (const id of selected) await approveTutor(id);
    setSelected([]);
  }
  async function bulkSuspend() {
    for (const id of selected) await suspendTutor(id);
    setSelected([]);
  }
  async function bulkVerify() {
    for (const id of selected) await verifyTutor(id);
    setSelected([]);
  }
  async function bulkFeature() {
    for (const id of selected) await toggleFeatured(id, true);
    setSelected([]);
  }

  /* ----------------------------- export CSV/XLSX ----------------------------- */
  function exportCSV() {
    const csv = [
      ["ID", "Name", "Email", "Languages", "Rate", "Currency", "Rating", "Lessons", "Status", "Verified", "Featured", "Country", "CreatedAt"],
      ...sorted.map((t) => [
        t.id,
        t.name,
        t.email,
        (t.langs || []).join("|"),
        t.rate,
        t.currency,
        t.rating,
        t.lessons,
        t.status,
        t.verified ? "yes" : "no",
        t.featured ? "yes" : "no",
        t.country || "",
        t.createdAt,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tutors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    const xlsxMod = await import("xlsx");
    const XLSX = xlsxMod.default || xlsxMod;
    const rows = [
      ["ID", "Name", "Email", "Languages", "Rate", "Currency", "Rating", "Lessons", "Status", "Verified", "Featured", "Country", "CreatedAt"],
      ...(items || []).map((d) => [
        d.id,
        d.name,
        d.email,
        (d.langs || []).join("|"),
        d.rate,
        d.currency,
        d.rating,
        d.lessons,
        d.status,
        d.verified ? "yes" : "no",
        d.featured ? "yes" : "no",
        d.country || "",
        d.createdAt,
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Tutors");
    XLSX.writeFile(wb, "tutors.xlsx");
  }

  /* ----------------------------- selection helpers ----------------------------- */
  function selectPage() {
    setSelected(Array.from(new Set(paged.map((r) => r.id))));
  }
  function selectAllResults() {
    setSelected(Array.from(new Set(filtered.map((r) => r.id))));
  }
  function clearSelection() {
    setSelected([]);
  }

  /* ----------------------------- UI ----------------------------- */
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-xl">
          Tutors {IS_MOCK && <span className="text-sm opacity-60">(Mock)</span>}
        </h2>
        {error && (
          <span className="ml-2 text-red-600 text-sm">
            {error}{" "}
            <button className="underline" onClick={load}>
              retry
            </button>
          </span>
        )}
        <button className="px-3 py-1 border rounded ml-auto" onClick={exportCSV}>
          Export CSV
        </button>
        <button className="px-3 py-1 border rounded" onClick={exportXLSX}>
          Export XLSX
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Total</div>
          <div>{kpi.total}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Approved</div>
          <div>{kpi.approved}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Pending</div>
          <div>{kpi.pending}</div>
        </div>
        <div className="bg-white border rounded-2xl p-3 text-center">
          <div className="font-semibold">Avg Rating</div>
          <div>{kpi.avgRating}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">Filters</h3>
            <input
              className="border rounded px-2 py-1 w-full mb-2"
              placeholder="Search tutors…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All status</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="suspended">suspended</option>
            </select>
            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                Verified
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={verified}
                  onChange={(e) => {
                    setVerified(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="text-sm">
                Featured
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={featured}
                  onChange={(e) => {
                    setFeatured(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-sm">
                Min rating
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  className="border rounded px-2 py-1 w-full"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="text-sm">
                Currency
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any</option>
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setLang("");
                  setVerified("");
                  setFeatured("");
                  setMinRating("");
                  setCurrency("");
                  setCountry("");
                  setPage(1);
                }}
              >
                Clear
              </button>
              <button className="px-3 py-1 border rounded" onClick={load} disabled={loading}>
                {loading ? "Loading…" : "Reload"}
              </button>
            </div>

            {/* Selection Tools */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="px-3 py-1 border rounded" onClick={selectPage}>
                Select page
              </button>
              <button className="px-3 py-1 border rounded" onClick={selectAllResults}>
                Select all results
              </button>
              <button className="px-3 py-1 border rounded" onClick={clearSelection}>
                Clear selection
              </button>
              <span className="text-sm text-gray-600 ml-2">
                Selected {selected.length} / {filtered.length}
              </span>
            </div>
          </div>
        </div>

        {/* Table + toolbar */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button className="px-3 py-1 border rounded" onClick={bulkApprove} disabled={!selected.length}>
              Bulk Approve
            </button>
            <button className="px-3 py-1 border rounded" onClick={bulkSuspend} disabled={!selected.length}>
              Bulk Suspend
            </button>
            <button className="px-3 py-1 border rounded" onClick={bulkVerify} disabled={!selected.length}>
              Bulk Verify
            </button>
            <button className="px-3 py-1 border rounded" onClick={bulkFeature} disabled={!selected.length}>
              Bulk Feature
            </button>
            <button className="px-3 py-1 border rounded ml-auto" onClick={exportCSV}>
              Export CSV
            </button>
            <button className="px-3 py-1 border rounded" onClick={exportXLSX}>
              Export XLSX
            </button>
          </div>

          <div className="overflow-auto border rounded-2xl">
            {loading ? (
              <div className="p-6 text-gray-600">Loading…</div>
            ) : paged.length === 0 ? (
              <div className="p-6 text-gray-600">No tutors found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border-b">
                      <input
                        type="checkbox"
                        checked={paged.length > 0 && selected.length === paged.length}
                        onChange={(e) => setSelected(e.target.checked ? paged.map((t) => t.id) : [])}
                      />
                    </th>
                    <th className="px-3 py-2 border-b text-left">Name</th>
                    <th className="px-3 py-2 border-b text-left">Email</th>
                    <th className="px-3 py-2 border-b text-left">Country</th>
                    <th className="px-3 py-2 border-b text-left">Languages</th>
                    <th className="px-3 py-2 border-b text-right">Rate</th>
                    <th className="px-3 py-2 border-b text-left">Currency</th>
                    <th className="px-3 py-2 border-b text-right">Rating</th>
                    <th className="px-3 py-2 border-b text-right">Lessons</th>
                    <th className="px-3 py-2 border-b text-left">Status</th>
                    <th className="px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t) => (
                    <tr key={t.id} className="border-t align-top">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={(e) =>
                            setSelected((s) =>
                              e.target.checked ? [...new Set([...s, t.id])] : s.filter((x) => x !== t.id)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {t.name}
                        {t.featured && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-amber-50">
                            featured
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{t.email}</td>
                      <td className="px-3 py-2">{t.country || "—"}</td>
                      <td className="px-3 py-2">{(t.langs || []).join(", ")}</td>
                      <td className="px-3 py-2 text-right">{t.rate?.toFixed(2)}</td>
                      <td className="px-3 py-2">{t.currency || "—"}</td>
                      <td className="px-3 py-2 text-right">{t.rating?.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{t.lessons ?? 0}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            t.status === "approved"
                              ? "bg-green-50"
                              : t.status === "pending"
                              ? "bg-yellow-50"
                              : t.status === "suspended"
                              ? "bg-red-50"
                              : "bg-gray-50"
                          }`}
                        >
                          {t.status}
                        </span>
                        {t.verified && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-blue-50">
                            verified
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {t.status !== "approved" && (
                          <button className="px-2 py-1 border rounded mr-2" onClick={() => approveTutor(t.id)}>
                            Approve
                          </button>
                        )}
                        {t.status !== "suspended" ? (
                          <button className="px-2 py-1 border rounded mr-2" onClick={() => suspendTutor(t.id)}>
                            Suspend
                          </button>
                        ) : (
                          <button className="px-2 py-1 border rounded mr-2" onClick={() => unsuspendTutor(t.id)}>
                            Unsuspend
                          </button>
                        )}
                        {!t.verified && (
                          <button className="px-2 py-1 border rounded mr-2" onClick={() => verifyTutor(t.id)}>
                            Verify
                          </button>
                        )}
                        <button
                          className="px-2 py-1 border rounded mr-2"
                          onClick={() => toggleFeatured(t.id, !t.featured)}
                        >
                          {t.featured ? "Unfeature" : "Feature"}
                        </button>
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => {
                            const newRate = prompt("Set hourly rate", String(t.rate ?? ""));
                            if (newRate == null) return;
                            const newCurr = prompt("Currency (e.g., USD/EUR)", String(t.currency ?? "USD"));
                            if (newCurr == null) return;
                            setRate(t.id, newRate, newCurr);
                          }}
                        >
                          Set Rate
                        </button>
                        <button
                          className="ml-2 text-xs underline"
                          onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                        >
                          {expanded === t.id ? "Hide" : "Details"}
                        </button>

                        {expanded === t.id && (
                          <div className="mt-2 text-xs text-gray-700 border-t pt-2">
                            <div><b>ID:</b> {t.id}</div>
                            <div><b>Created:</b> {t.createdAt}</div>
                            <div><b>Lessons:</b> {t.lessons}</div>
                            <div><b>Rating:</b> {t.rating}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 border rounded-xl text-sm">
            <b>Total Tutors:</b> {items.length}
            <br />
            <b>Average Rating:</b>{" "}
            {items.length
              ? (
                  items.reduce((sum, x) => sum + (Number(x.rating) || 0), 0) / items.length
                ).toFixed(2)
              : "0.00"}{" "}
            ⭐
            <br />
            <b>Total Lessons Taught:</b>{" "}
            {items.reduce((sum, x) => sum + (x.lessons || 0), 0)}
            <br />
            <b>By Currency:</b>{" "}
            {Object.entries(
              items.reduce((acc, x) => {
                const c = x.currency || "USD";
                acc[c] = (acc[c] || 0) + (Number(x.rate) || 0);
                return acc;
              }, {})
            )
              .map(([c, v]) => `${c}: ${v.toFixed(2)}`)
              .join(", ")}
          </div>

          {/* Pagination */}
          {sorted.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

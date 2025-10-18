// client/src/api/tutors.js
const MOCK = import.meta.env.VITE_MOCK === "1";
const API = import.meta.env.VITE_API || "http://localhost:5000";

async function jsonOrThrow(r, msg = "Request failed") {
  const t = await r.text();
  let data;
  try { data = t ? JSON.parse(t) : {}; } catch { data = { message: t }; }
  if (!r.ok) throw new Error(data.message || `${msg} (HTTP ${r.status})`);
  return data;
}

const mockTutors = [
  { _id: "t1", name: "Bob Tutor", subjects: ["English"], price: 25, avgRating: 4.8, reviewsCount: 3, avatar: "" },
  { _id: "t2", name: "IELTS Pro", subjects: ["English","IELTS"], price: 40, avgRating: 4.6, reviewsCount: 12, avatar: "" },
  { _id: "t3", name: "Business Coach", subjects: ["Business English"], price: 55, avgRating: 4.9, reviewsCount: 21, avatar: "" },
  { _id: "t4", name: "Budget Tutor", subjects: ["English"], price: 12, avgRating: 4.1, reviewsCount: 5, avatar: "" },
];

function applyFilters(list, { q, subject, minRating, priceMin, priceMax }) {
  let out = [...list];
  if (q) {
    const s = q.toLowerCase();
    out = out.filter(t =>
      t.name.toLowerCase().includes(s) ||
      t.subjects.join(",").toLowerCase().includes(s)
    );
  }
  if (subject) out = out.filter(t => t.subjects.includes(subject));
  if (minRating) out = out.filter(t => (t.avgRating || 0) >= Number(minRating));
  if (priceMin) out = out.filter(t => t.price >= Number(priceMin));
  if (priceMax) out = out.filter(t => t.price <= Number(priceMax));
  return out;
}

export async function getTutors(params = {}) {
  const { page = 1, limit = 10, q = "", subject = "", minRating = "", priceMin = "", priceMax = "" } = params;

  if (MOCK) {
    const filtered = applyFilters(mockTutors, { q, subject, minRating, priceMin, priceMax });
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return { data, total: filtered.length, page };
  }

  const qs = new URLSearchParams({ page, limit, q, subject, minRating, priceMin, priceMax }).toString();
  const r = await fetch(`${API}/api/tutors?${qs}`);
  return jsonOrThrow(r, "Failed to load tutors");
}

export async function getTutor(id) {
  if (MOCK) return mockTutors.find(t => t._id === id) || mockTutors[0];
  const r = await fetch(`${API}/api/tutors/${id}`);
  return jsonOrThrow(r, "Failed to load tutor");
}

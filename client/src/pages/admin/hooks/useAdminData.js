// Unified fetcher with mock fallbacks mirroring AdminDashboard.getJSON
export async function getJSON(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (url === "/api/admin/users") {
      return { items: [
        { id:"u1", name:"Alice Student", email:"alice@example.com", role:"student", verified:false, suspended:false },
        { id:"u2", name:"Bob Tutor", email:"bob@example.com", role:"tutor", verified:true, suspended:false },
        { id:"u3", name:"Admin", email:"admin@example.com", role:"admin", verified:true, suspended:false },
      ]};
    }
    if (url === "/api/tutors") {
      return { items: [
        { id:"t1", name:"Bob Tutor", subject:"English", price:25, rating:4.8, status:"approved" },
        { id:"t2", name:"Jane Tutor", subject:"Spanish", price:20, rating:4.5, status:"pending" },
      ]};
    }
    if (url === "/api/lessons") {
      return { items: [
        { id:"L1", student:"Alice", studentId:"u1", tutor:"Bob Tutor", start:"2025-10-02T12:00:00Z", duration:60, status:"booked", rescheduleRequested:true, studentTrialCount:1, studentTrialLimit:1 },
        { id:"L2", student:"Alice", studentId:"u1", tutor:"Jane Tutor", start:"2025-10-05T09:00:00Z", duration:30, status:"trial", rescheduleRequested:false, studentTrialCount:0, studentTrialLimit:1 },
        { id:"L3", student:"Charlie", studentId:"u4", tutor:"Bob Tutor", start:"2025-10-06T15:30:00Z", duration:45, status:"booked", rescheduleRequested:false, studentTrialCount:2, studentTrialLimit:1 },
      ]};
    }
    if (url === "/api/payouts") {
      return { items: [
        { id:"P1", tutor:"Bob Tutor", method:"Stripe", amount:62.5, currency:"EUR", status:"queued", createdAt:"2025-09-29T09:15:00Z" },
        { id:"P2", tutor:"Jane Tutor", method:"PayPal", amount:120, currency:"USD", status:"paid", createdAt:"2025-09-27T16:40:00Z" },
      ]};
    }
    if (url === "/api/refunds") {
      return { items: [
        { id:"R1", student:"Alice", tutor:"Bob Tutor", lessonId:"L1", amount:25, currency:"EUR", reason:"Student canceled within policy", status:"processed", createdAt:"2025-09-26T11:00:00Z" },
        { id:"R2", student:"Charlie", tutor:"Jane Tutor", lessonId:"L3", amount:20, currency:"USD", reason:"No-show", status:"queued", createdAt:"2025-09-28T08:30:00Z" },
      ]};
    }
    if (url === "/api/notifications") {
      return { items: [
        { id:"N1", userId:"u2", type:"payout.queued", title:"Payout queued", message:"€62.50 payout queued to Stripe.", read:false, createdAt:"2025-09-29T09:16:00Z" },
        { id:"N2", userId:"u1", type:"lesson.reminder", title:"Lesson reminder", message:"Trial with Bob Tutor starts in 24 hours.", read:true, createdAt:"2025-09-28T12:00:00Z" },
      ]};
    }
    if (url === "/api/admin/disputes") {
      return { items: [
        { id:"D1", user:{ id:"u1", name:"Alice Student", email:"alice@example.com" }, lesson:{ id:"L1", subject:"English", startTime:"2025-09-30T10:00:00Z", endTime:"2025-09-30T11:00:00Z", status:"completed"}, reason:"Tutor ended lesson early", status:"open", createdAt:"2025-09-30T12:00:00Z" },
        { id:"D2", user:{ id:"u2", name:"Bob Tutor", email:"bob@example.com" }, lesson:{ id:"L2", subject:"Spanish", startTime:"2025-09-29T15:00:00Z", endTime:"2025-09-29T15:30:00Z", status:"canceled"}, reason:"Student no-show dispute", status:"open", createdAt:"2025-09-29T16:00:00Z" },
        { id:"D3", user:{ id:"u5", name:"Ella Student", email:"ella@example.com" }, lesson:{ id:"L9", subject:"German", startTime:"2025-09-27T09:00:00Z", endTime:"2025-09-27T10:00:00Z", status:"completed"}, reason:"Audio issues claim", status:"resolved", createdAt:"2025-09-27T11:00:00Z" },
      ]};
    }
    return [];
  }
}

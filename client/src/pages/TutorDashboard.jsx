// /client/src/pages/TutorDashboard.jsx
export default function TutorDashboard() {
  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Tutor Dashboard</h1>
      <p style={{ marginTop: 0 }}>
        Welcome! This page will show your lessons, students, and earnings.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>Today</h2>
        <ul>
          <li>Upcoming lessons: —</li>
          <li>Unread messages: —</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Quick actions</h2>
        <ul>
          <li>Open calendar</li>
          <li>Message a student</li>
          <li>Review payouts</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Stats (this month)</h2>
        <ul>
          <li>Lessons taught: —</li>
          <li>Earnings: —</li>
          <li>New students: —</li>
        </ul>
      </section>
    </div>
  );
}

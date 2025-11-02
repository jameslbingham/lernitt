#!/usr/bin/env node
// /server/scripts/postReview.js
const fetch = require('node-fetch'); // v2 (CommonJS)
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
const token = args.token || args.t;
const lesson = args.lesson || args.l;
const rating = args.rating != null ? Number(args.rating) : null;
const comment = args.comment || args.c || '';

if (!token || !lesson || rating == null || Number.isNaN(rating)) {
  console.error('Usage: node scripts/postReview.js --token TOKEN --lesson LESSON_ID --rating 5 --comment "text"');
  process.exit(1);
}

(async () => {
  try {
    const url = `http://localhost:5000/api/reviews?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson, rating, comment })
    });

    let data;
    try { data = await res.json(); } catch { data = { error: 'Non-JSON response' }; }

    if (!res.ok) {
      console.error('Error:', data);
      process.exit(1);
    }

    console.log('Created review id:', data.id);
  } catch (e) {
    console.error('Request failed:', e.message);
    process.exit(1);
  }
})();

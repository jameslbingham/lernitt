// client/src/lib/safeFetch.js

// This is the address of your LIVE server on Render
export const API = "https://lernitt-server.onrender.com";

export async function safeFetch(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  
  // Get your digital ID card (token) from the computer's memory
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Set the format to JSON so the server understands the data
  if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, { 
      ...opts, 
      headers,
      mode: 'cors' // This helps different websites talk to each other safely
    });
    return response;
  } catch (err) {
    // If it still fails, we create a clear error message
    return new Response(JSON.stringify({ error: "Could not connect to the Lernitt server." }), {
      status: 599,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function safeFetchJSON(url, opts = {}) {
  const res = await safeFetch(url, opts);
  try {
    const data = await res.json();
    return data;
  } catch {
    return { error: "The server sent back an empty response." };
  }
}

// /client/src/api/refunds.js
import { apiFetch } from "../lib/http";

export async function approveRefund(id, reason) {
  return apiFetch(`/api/refunds/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function denyRefund(id, reason) {
  return apiFetch(`/api/refunds/${id}/deny`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

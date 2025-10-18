// client/src/mock/payoutsQueue.js
import {
  listPayouts,
  updatePayout,
  listRefunds,
  updateRefund,
} from "./payoutsStore.js";
import { addNotification } from "./notificationsStore.js";

let timer = null;

const ageMs = (iso) => Date.now() - new Date(iso).getTime();
const nowISO = () => new Date().toISOString();
const fmtMoney = (cents, cur = "EUR") =>
  `${(Number(cents || 0) / 100).toFixed(2)} ${cur}`;

function tick() {
  console.log("mock-queue: tick"); // 🔍 debug

  // Payouts: queued -> processing -> paid
  for (const p of listPayouts()) {
    if (p.status === "queued") {
      updatePayout(p.id, { status: "processing", startedAt: nowISO() });
    } else if (p.status === "processing" && p.startedAt && ageMs(p.startedAt) > 3000) {
      const updated = updatePayout(p.id, {
        status: "paid",
        paidAt: nowISO(),
        txId: "tx_" + Math.random().toString(36).slice(2, 10),
      });
      // Notify user when payout is paid
      addNotification({
        userId: updated.userId || "Udemo",
        title: "Payout paid",
        body: `€${(Number(updated.amountCents || 0) / 100).toFixed(2)} via ${updated.provider || "provider"}.`,
        type: "payout",
        relatedId: updated.id,
      });
    }
  }

  // Refunds: queued -> processing -> refunded
  for (const r of listRefunds()) {
    if (r.status === "queued") {
      updateRefund(r.id, { status: "processing", startedAt: nowISO() });
    } else if (r.status === "processing" && r.startedAt && ageMs(r.startedAt) > 3000) {
      const updated = updateRefund(r.id, {
        status: "refunded",
        refundedAt: nowISO(),
        txId: "rf_" + Math.random().toString(36).slice(2, 10),
      });
      addNotification({
        userId: updated.userId || "Udemo",
        title: "Refund completed",
        body: `Refund ${updated.id} sent: ${fmtMoney(updated.amountCents, updated.currency || "EUR")} via ${updated.provider || "provider"}.`,
        type: "refund",
        relatedId: updated.id,
      });
    }
  }
}

export function startPayoutsMockQueue() {
  if (timer || import.meta.env.VITE_MOCK !== "1") return;
  console.log("mock-queue: started"); // 🔍 debug
  timer = setInterval(tick, 1000);
}

export function stopPayoutsMockQueue() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

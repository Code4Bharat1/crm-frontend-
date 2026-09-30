// Formatting helpers and shared enums used across real, backend-driven
// pages. This file used to also hold ~1100 lines of seeded-random mock
// data (fake customers, invoices, leads, projects, notifications, etc.) --
// removed once every page was confirmed wired to real API data instead.

export const inr = (n) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const inrShort = (n) => {
  n = n || 0;
  const isNegative = n < 0;
  const absN = Math.abs(n);
  let formatted = "";
  if (absN >= 1e7) formatted = `₹${(absN / 1e7).toFixed(2)} Cr`;
  else if (absN >= 1e5) formatted = `₹${(absN / 1e5).toFixed(1)} L`;
  else if (absN >= 1e3) formatted = `₹${(absN / 1e3).toFixed(0)}K`;
  else formatted = inr(absN);
  return isNegative ? `-${formatted}` : formatted;
};

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    : "—";

// Lead pipeline stages -- a config/enum list, mirrors Lead.stage in the backend.
export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Potential",
  "Hot",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold",
];

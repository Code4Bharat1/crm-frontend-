// Formatting helpers and shared enums used across real, backend-driven
// pages. This file used to also hold ~1100 lines of seeded-random mock
// data (fake customers, invoices, leads, projects, notifications, etc.) --
// removed once every page was confirmed wired to real API data instead.

export const inr = (n) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const inrShort = (n) => {
  n = n || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return inr(n);
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

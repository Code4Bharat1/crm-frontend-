"use client";
import React from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
const GREEN = ["Won", "Paid", "Completed", "Closed", "Delivered", "Received", "Accepted", "Reconciled", "Online", "Connected", "Approved", "Reimbursed", "Fully Delivered", "Installed", "Repeat Customer", "Key Account"];
const RED = ["Lost", "Overdue", "Rejected", "Failed", "Offline", "Error", "Cancelled", "Returned", "Critical", "Unmatched"];
const YELLOW = ["Pending", "Sent", "Viewed", "Negotiation", "Assigned", "Scheduled", "Partially Paid", "Partially Delivered", "Partially Received", "Suggested", "Awaiting review", "Submitted", "Configuration required", "Needs Review", "Snoozed", "Open"];
const ORANGE = ["On Hold", "Degraded", "Under Repair", "Expired", "In Transit", "Warning", "In Progress", "Commissioning", "High"];
const GRAY = ["Draft", "Inactive", "Dormant", "Not connected", "Read-only", "Low", "Replaced"];
function StatusBadge({ value, className }) {
  const tone = GREEN.includes(value) ? "bg-success/12 text-success border-success/30" : RED.includes(value) ? "bg-destructive/12 text-destructive border-destructive/30" : YELLOW.includes(value) ? "bg-accent/25 text-accent-foreground border-accent/60" : ORANGE.includes(value) ? "bg-warning/20 text-warning-foreground border-warning/50" : GRAY.includes(value) ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/25";
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      className: cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold",
        tone,
        className
      )
    },
    value
  );
}
function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb
}) {
  return /* @__PURE__ */ React.createElement("div", { className: "mb-5 flex flex-wrap items-end justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, breadcrumb ? /* @__PURE__ */ React.createElement("div", { className: "mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground" }, breadcrumb.split("/").map((b, i) => /* @__PURE__ */ React.createElement("span", { key: b, className: "flex items-center gap-1" }, i > 0 && /* @__PURE__ */ React.createElement(ChevronRight, { className: "size-3" }), b.trim()))) : null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold uppercase tracking-wide text-foreground sm:text-3xl" }, title), subtitle ? /* @__PURE__ */ React.createElement("p", { className: "mt-1 max-w-3xl text-sm text-muted-foreground" }, subtitle) : null), actions ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, actions) : null);
}
function Kpi({
  label,
  value,
  sub,
  tone = "default",
  icon: Icon
}) {
  const bar = {
    default: "bg-primary",
    accent: "bg-accent",
    success: "bg-success",
    danger: "bg-destructive",
    warning: "bg-warning"
  }[tone];
  return /* @__PURE__ */ React.createElement("div", { className: "panel relative overflow-hidden p-4" }, /* @__PURE__ */ React.createElement("span", { className: cn("absolute inset-y-0 left-0 w-1", bar) }), /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2 pl-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, label), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-2xl font-bold leading-none text-foreground" }, value), sub ? /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-muted-foreground" }, sub) : null), Icon ? /* @__PURE__ */ React.createElement(Icon, { className: "size-5 shrink-0 text-primary/70" }) : null));
}
function Section({
  title,
  description,
  actions,
  children,
  className
}) {
  return /* @__PURE__ */ React.createElement("section", { className: cn("panel", className) }, title ? /* @__PURE__ */ React.createElement("header", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold uppercase tracking-wide" }, title), description ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, description) : null), actions) : null, /* @__PURE__ */ React.createElement("div", { className: "p-4" }, children));
}
function DataTable({
  rows,
  columns,
  searchKeys = [],
  filters,
  emptyLabel = "No records",
  toolbar
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 12;
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const flatten = (v) => {
      if (v === null || v === void 0) return "";
      if (Array.isArray(v)) return v.map(flatten).join(" ");
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object") return Object.values(v).map(flatten).join(" ");
      return String(v);
    };
    return rows.filter((r) => {
      const hay = flatten(r).toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [q, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const view = filtered.slice(page * perPage, page * perPage + perPage);
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const csvContent = [
      headers.join(","),
      ...rows.map(row => headers.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export successful", { description: "Data downloaded as CSV (Excel compatible)." });
  };

  return /* @__PURE__ */ React.createElement("div", { className: "panel overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-border p-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative min-w-[200px] flex-1" }, /* @__PURE__ */ React.createElement(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ React.createElement(
    Input,
    {
      value: q,
      onChange: (e) => {
        setQ(e.target.value);
        setPage(0);
      },
      placeholder: "Search records\u2026",
      className: "h-10 pl-8"
    }
  )), toolbar, filters ? /* @__PURE__ */ React.createElement(Sheet, null, /* @__PURE__ */ React.createElement(SheetTrigger, { asChild: true }, /* @__PURE__ */ React.createElement(Button, { variant: "outline", className: "h-10 gap-2" }, /* @__PURE__ */ React.createElement(SlidersHorizontal, { className: "size-4" }), " Filters")), /* @__PURE__ */ React.createElement(SheetContent, { className: "w-full sm:max-w-md" }, /* @__PURE__ */ React.createElement(SheetHeader, null, /* @__PURE__ */ React.createElement(SheetTitle, null, "Advanced filters"), /* @__PURE__ */ React.createElement(SheetDescription, null, "Narrow down records. Prototype filters are illustrative.")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4" }, filters))) : null, /* @__PURE__ */ React.createElement(
    Button,
    {
      variant: "secondary",
      className: "h-10 gap-2",
      onClick: handleExport
    },
    /* @__PURE__ */ React.createElement(Download, { className: "size-4" }),
    " Export"
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-muted/70 text-left" }, columns.map((c) => /* @__PURE__ */ React.createElement(
    "th",
    {
      key: c.header,
      className: cn(
        "whitespace-nowrap px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground",
        c.className
      )
    },
    c.header
  )))), /* @__PURE__ */ React.createElement("tbody", null, view.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: columns.length, className: "px-3 py-10 text-center text-muted-foreground" }, emptyLabel)) : view.map((row, i) => /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-border hover:bg-muted/50" }, columns.map((c) => /* @__PURE__ */ React.createElement("td", { key: c.header, className: cn("px-3 py-2.5 align-middle", c.className) }, c.cell(row)))))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground" }, /* @__PURE__ */ React.createElement("span", null, filtered.length, " record", filtered.length === 1 ? "" : "s", " \xB7 page ", page + 1, " of ", pages), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage((p) => p - 1) }, "Previous"), /* @__PURE__ */ React.createElement(Button, { variant: "outline", size: "sm", disabled: page >= pages - 1, onClick: () => setPage((p) => p + 1) }, "Next"))));
}
function FilterBar({ items }) {
  const [active, setActive] = useState(items[0]);
  return /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(Filter, { className: "size-4 text-muted-foreground" }), items.map((i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => setActive(i),
      className: cn(
        "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
        active === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"
      )
    },
    i
  )));
}
const KIND_TONE = {
  Lead: "bg-primary",
  Visit: "bg-accent",
  Email: "bg-primary/70",
  WhatsApp: "bg-success",
  Call: "bg-primary/70",
  "Voice Note": "bg-warning",
  Note: "bg-muted-foreground",
  Quotation: "bg-primary",
  Proforma: "bg-warning",
  "Sales Order": "bg-primary-dark",
  Delivery: "bg-primary/80",
  Invoice: "bg-accent",
  Payment: "bg-success",
  Project: "bg-primary-dark",
  Service: "bg-destructive"
};
function Timeline({
  items
}) {
  return /* @__PURE__ */ React.createElement("ol", { className: "relative space-y-4 border-l border-border pl-5" }, items.map((it, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "relative" }, /* @__PURE__ */ React.createElement(
    "span",
    {
      className: cn(
        "absolute -left-[26px] top-1.5 size-3 rounded-full ring-2 ring-card",
        KIND_TONE[it.kind] ?? "bg-primary"
      )
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(StatusBadge, { value: it.kind }), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold" }, it.title), it.ref ? /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-muted-foreground" }, it.ref) : null), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-muted-foreground" }, it.detail), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-muted-foreground" }, it.at.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }), " ", "\xB7 ", it.by))), items.length === 0 ? /* @__PURE__ */ React.createElement("li", { className: "text-sm text-muted-foreground" }, "No activity recorded yet.") : null);
}
function ChainStrip({
  steps
}) {
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" }, steps.map((s, i) => /* @__PURE__ */ React.createElement("span", { key: s.label, className: "flex items-center gap-1.5" }, i > 0 && /* @__PURE__ */ React.createElement(ArrowRight, { className: "size-3.5 text-muted-foreground" }), /* @__PURE__ */ React.createElement(
    "span",
    {
      className: cn(
        "rounded-md border px-2.5 py-1.5 text-xs font-semibold",
        s.state === "done" ? "border-success/40 bg-success/12 text-success" : s.state === "current" ? "border-accent bg-accent text-accent-foreground" : "border-dashed border-border bg-muted text-muted-foreground"
      )
    },
    s.label,
    s.value ? /* @__PURE__ */ React.createElement("span", { className: "ml-1.5 font-mono font-normal opacity-80" }, s.value) : null
  ))));
}
function Field({ label, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement(Label, { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, label), children);
}
function KeyValue({ items }) {
  return /* @__PURE__ */ React.createElement("dl", { className: "grid gap-x-6 gap-y-3 sm:grid-cols-2" }, items.map((i) => /* @__PURE__ */ React.createElement("div", { key: i.k }, /* @__PURE__ */ React.createElement("dt", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, i.k), /* @__PURE__ */ React.createElement("dd", { className: "mt-0.5 text-sm font-medium text-foreground" }, i.v))));
}
function RelatedLink({ to, label, value }) {
  return /* @__PURE__ */ React.createElement(
    Link,
    {
      to,
      className: "flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-muted-foreground" }, label),
    /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 font-semibold text-primary" }, value, " ", /* @__PURE__ */ React.createElement(ChevronRight, { className: "size-4" }))
  );
}
function NotBuiltNotice({ children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "rounded-md border border-dashed border-warning/60 bg-warning/10 px-3 py-2 text-xs font-medium text-foreground" }, children);
}
function Metric({ label, value, tone }) {
  return /* @__PURE__ */ React.createElement("div", { className: "rounded-md border border-border bg-muted/40 px-3 py-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, label), /* @__PURE__ */ React.createElement(
    "p",
    {
      className: cn(
        "font-display text-lg font-bold",
        tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground"
      )
    },
    value
  ));
}
function Badges({ list }) {
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, list.map((l, i) => /* @__PURE__ */ React.createElement(Badge, { key: `${l}-${i}`, variant: "secondary", className: "font-medium" }, l)));
}
export {
  Badges,
  ChainStrip,
  DataTable,
  Field,
  FilterBar,
  KeyValue,
  Kpi,
  Metric,
  NotBuiltNotice,
  PageHeader,
  RelatedLink,
  Section,
  StatusBadge,
  Timeline
};

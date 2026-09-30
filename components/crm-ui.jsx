"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronRight,
  User,
  MapPin,
  RotateCcw,
  Plus,
  TrendingUp,
  AlertTriangle,
  Package,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
  GripHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
  return (
    <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3">
      <div className="min-w-0 flex-1">
        {breadcrumb ? (
          <div className="mb-1 flex items-center gap-1 text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {breadcrumb.split("/").map((b, i) => (
              <span key={b} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                {b.trim()}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="text-xl font-bold uppercase tracking-wide text-foreground sm:text-3xl leading-tight break-words">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

const KPI_THEMES = {
  default: {
    card: "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50 text-blue-950 dark:text-blue-100 shadow-2xs",
    iconBox: "bg-blue-100/90 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300 shadow-2xs",
    chevron: "text-blue-500",
    defaultIcon: Package,
  },
  blue: {
    card: "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/50 text-blue-950 dark:text-blue-100 shadow-2xs",
    iconBox: "bg-blue-100/90 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300 shadow-2xs",
    chevron: "text-blue-500",
    defaultIcon: Package,
  },
  success: {
    card: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100 shadow-2xs",
    iconBox: "bg-emerald-100/90 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300 shadow-2xs",
    chevron: "text-emerald-500",
    defaultIcon: CheckCircle2,
  },
  green: {
    card: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100 shadow-2xs",
    iconBox: "bg-emerald-100/90 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300 shadow-2xs",
    chevron: "text-emerald-500",
    defaultIcon: CheckCircle2,
  },
  warning: {
    card: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-950 dark:text-amber-100 shadow-2xs",
    iconBox: "bg-amber-100/90 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300 shadow-2xs",
    chevron: "text-amber-500",
    defaultIcon: AlertTriangle,
  },
  amber: {
    card: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-950 dark:text-amber-100 shadow-2xs",
    iconBox: "bg-amber-100/90 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300 shadow-2xs",
    chevron: "text-amber-500",
    defaultIcon: AlertTriangle,
  },
  orange: {
    card: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-950 dark:text-amber-100 shadow-2xs",
    iconBox: "bg-amber-100/90 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300 shadow-2xs",
    chevron: "text-amber-500",
    defaultIcon: Package,
  },
  danger: {
    card: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-950 dark:text-rose-100 shadow-2xs",
    iconBox: "bg-rose-100/90 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300 shadow-2xs",
    chevron: "text-rose-500",
    defaultIcon: AlertTriangle,
  },
  destructive: {
    card: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-950 dark:text-rose-100 shadow-2xs",
    iconBox: "bg-rose-100/90 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300 shadow-2xs",
    chevron: "text-rose-500",
    defaultIcon: AlertTriangle,
  },
  red: {
    card: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-950 dark:text-rose-100 shadow-2xs",
    iconBox: "bg-rose-100/90 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300 shadow-2xs",
    chevron: "text-rose-500",
    defaultIcon: AlertTriangle,
  },
  accent: {
    card: "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-100 shadow-2xs",
    iconBox: "bg-indigo-100/90 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300 shadow-2xs",
    chevron: "text-indigo-500",
    defaultIcon: Sparkles,
  },
  indigo: {
    card: "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-100 shadow-2xs",
    iconBox: "bg-indigo-100/90 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300 shadow-2xs",
    chevron: "text-indigo-500",
    defaultIcon: Sparkles,
  },
  neutral: {
    card: "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs",
    iconBox: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs",
    chevron: "text-slate-500",
    defaultIcon: Layers,
  }
};

/**
 * Modern dark-tinted KPI card with prominent icon container,
 * bold metric typography, and trend indicator.
 */
function Kpi({
  label,
  value,
  sub,
  tone = "default",
  icon: CustomIcon,
  className,
  onClick,
  showChevron = false
}) {
  const theme = KPI_THEMES[tone] || KPI_THEMES.default;
  const IconComponent = CustomIcon || theme.defaultIcon;

  const subStr = typeof sub === "string" ? sub : "";
  const isPositiveTrend = subStr.startsWith("+") || subStr.toLowerCase().includes("vs last month") || subStr.toLowerCase().includes("up");
  const isNegativeTrend = subStr.startsWith("-") || subStr.toLowerCase().includes("down");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border p-3 sm:p-3.5 transition-all duration-200 shadow-2xs hover:shadow-xs",
        theme.card,
        onClick && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      {/* Top Row: Rounded Icon Badge */}
      <div className="mb-2 sm:mb-2.5 flex items-center">
        <div className={cn("size-8 sm:size-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs", theme.iconBox)}>
          {IconComponent ? <IconComponent className="size-4 sm:size-4.5" /> : null}
        </div>
        {showChevron ? (
          <ChevronRight className={cn("size-3.5 sm:size-4 transition-transform duration-200 group-hover:translate-x-0.5 ml-auto", theme.chevron)} />
        ) : null}
      </div>

      {/* Label & Value */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 leading-tight truncate">
          {label}
        </p>
        <p className="mt-0.5 sm:mt-1 font-display text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate leading-none">
          {value}
        </p>
      </div>

      {/* Subtext / Trend */}
      {sub ? (
        <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center gap-1 min-w-0">
          {isPositiveTrend ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-black text-emerald-800 dark:text-emerald-300 shrink-0">
              <TrendingUp className="size-3" />
            </span>
          ) : null}
          <span
            className={cn(
              "text-[10px] sm:text-xs truncate leading-tight font-semibold",
              isPositiveTrend
                ? "text-emerald-800 dark:text-emerald-300 font-bold"
                : isNegativeTrend
                ? "text-rose-800 dark:text-rose-300 font-bold"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            {sub}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  actions,
  children,
  className
}) {
  return (
    <section className={cn("panel min-w-0 overflow-hidden w-full", className)}>
      {title ? (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border px-3.5 py-2.5 sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-foreground break-words">
              {title}
            </h2>
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className="p-3 sm:p-4 min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}
function DataTable({
  rows,
  columns,
  searchKeys = [],
  filters,
  emptyLabel = "No records found",
  toolbar,
  mobileCard
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

  const startRecord = filtered.length === 0 ? 0 : page * perPage + 1;
  const endRecord = Math.min((page + 1) * perPage, filtered.length);

  return (
    <div className="panel overflow-hidden border border-border bg-card rounded-2xl shadow-xs">
      {/* Search and Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-card p-3 sm:p-3.5">
        <div className="relative min-w-[150px] sm:min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search records…"
            className="h-9 sm:h-9.5 pl-9 pr-8 text-xs sm:text-sm bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                setPage(0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 rounded-full hover:bg-muted"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {toolbar}
          {filters ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 sm:h-9.5 gap-1.5 px-3 text-xs sm:text-sm rounded-xl">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Advanced filters</SheetTitle>
                  <SheetDescription>Narrow down records. Prototype filters are illustrative.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 p-4">{filters}</div>
              </SheetContent>
            </Sheet>
          ) : null}
          <Button
            variant="outline"
            className="h-9 sm:h-9.5 gap-1.5 px-3 text-xs sm:text-sm rounded-xl font-medium text-foreground hover:bg-muted"
            onClick={handleExport}
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Mobile Card View (Custom or Smart Fallback) */}
      <div className="block md:hidden divide-y divide-border/60">
        {view.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground space-y-1">
            <p className="text-sm font-semibold text-foreground">{emptyLabel}</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query or clear active filters</p>
          </div>
        ) : (
          view.map((row, i) => {
            if (mobileCard) {
              return <div key={i}>{mobileCard(row, i)}</div>;
            }

            // Smart fallback card when no custom mobileCard is supplied
            const primaryCol = columns[0];
            const hasActionCol =
              columns.length > 1 &&
              (columns[columns.length - 1].header === "Actions" ||
                columns[columns.length - 1].header === "" ||
                columns[columns.length - 1].header === "Action");
            const actionCol = hasActionCol ? columns[columns.length - 1] : null;
            const dataCols = hasActionCol ? columns.slice(1, -1) : columns.slice(1);

            return (
              <div key={i} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 font-semibold text-sm">
                    {primaryCol ? primaryCol.cell(row) : null}
                  </div>
                </div>
                {dataCols.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs pt-1">
                    {dataCols.map((c) => (
                      <div key={c.header} className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
                          {c.header}
                        </span>
                        <div className="truncate text-foreground/90 mt-0.5">{c.cell(row)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {actionCol && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                    {actionCol.cell(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop / Standard Table View */}
      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 dark:bg-muted/20 border-b border-border text-left">
              {columns.map((c) => (
                <th
                  key={c.header}
                  className={cn(
                    "whitespace-nowrap px-3 sm:px-3.5 py-2.5 sm:py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none",
                    c.className
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center justify-center text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">{emptyLabel}</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your search query or clear filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              view.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {columns.map((c) => (
                    <td key={c.header} className={cn("px-3 sm:px-3.5 py-2.5 sm:py-3 align-middle", c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="font-medium">
          {filtered.length === 0 ? (
            "0 records"
          ) : (
            <span>
              Showing <strong className="text-foreground">{startRecord}</strong>–<strong className="text-foreground">{endRecord}</strong> of <strong className="text-foreground">{filtered.length}</strong> records
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-2 text-xs text-muted-foreground">
            Page <strong className="text-foreground">{page + 1}</strong> of <strong className="text-foreground">{pages}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 px-2.5 text-xs rounded-lg cursor-pointer disabled:opacity-40"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-2.5 text-xs rounded-lg cursor-pointer disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
function FilterBar({
  items,
  period,
  onPeriodChange,
  salespeople = [],
  selectedSalesperson = "All",
  onSalespersonChange,
  areas = [],
  selectedArea = "All",
  onAreaChange,
  onReset,
  loading = false,
  className
}) {
  const [internalActive, setInternalActive] = useState(items ? items[0] : "This month");
  const activePeriod = period !== undefined ? period : internalActive;

  const periodList = items && !onPeriodChange
    ? items
    : ["This month", "This quarter", "FY 2026-27", "All time"];

  const hasActiveFilters = Boolean(
    (activePeriod && activePeriod !== "This month") ||
    (selectedSalesperson && selectedSalesperson !== "All") ||
    (selectedArea && selectedArea !== "All")
  );

  return (
    <div className={cn("mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5", className)}>
      {/* Horizontal scrolling period buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 mr-0.5">
          <Filter className="size-3.5 sm:size-4" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
            Filters:
          </span>
        </div>
        {periodList.map((item) => {
          const isActive = activePeriod === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                if (onPeriodChange) onPeriodChange(item);
                else setInternalActive(item);
              }}
              className={cn(
                "whitespace-nowrap rounded-md border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Select Dropdowns: 2-column grid on phone, flex on desktop */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="grid grid-cols-2 gap-1.5 flex-1 sm:flex-initial sm:flex sm:items-center">
          {onSalespersonChange ? (
            <Select value={selectedSalesperson} onValueChange={onSalespersonChange} modal={false}>
              <SelectTrigger className="h-8 w-full sm:w-auto sm:min-w-[145px] text-xs font-semibold bg-card border-border hover:bg-muted text-foreground cursor-pointer shadow-2xs">
                <User className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All salespeople" />
              </SelectTrigger>
              <SelectContent className="max-h-60 w-[var(--radix-select-trigger-width)] min-w-[160px]">
                <SelectItem value="All">All salespeople</SelectItem>
                {salespeople.map((sp) => (
                  <SelectItem key={sp} value={sp}>
                    {sp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {onAreaChange ? (
            <Select value={selectedArea} onValueChange={onAreaChange} modal={false}>
              <SelectTrigger className="h-8 w-full sm:w-auto sm:min-w-[120px] text-xs font-semibold bg-card border-border hover:bg-muted text-foreground cursor-pointer shadow-2xs">
                <MapPin className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent className="max-h-60 w-[var(--radix-select-trigger-width)] min-w-[150px]">
                <SelectItem value="All">All areas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {hasActiveFilters && onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            <span className="hidden xs:inline sm:inline">Reset</span>
          </Button>
        ) : null}

        {loading ? (
          <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse shrink-0">
            Filtering...
          </span>
        ) : null}
      </div>
    </div>
  );
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

function Timeline({ items }) {
  return (
    <ol className="relative space-y-3.5 sm:space-y-4 border-l border-border pl-4 sm:pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[22px] sm:-left-[26px] top-1.5 size-2.5 sm:size-3 rounded-full ring-2 ring-card",
              KIND_TONE[it.kind] ?? "bg-primary"
            )}
          />
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <StatusBadge value={it.kind} />
            <span className="text-xs sm:text-sm font-semibold">{it.title}</span>
            {it.ref ? (
              <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">{it.ref}</span>
            ) : null}
          </div>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{it.detail}</p>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
            {it.at.toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata"
            })}{" "}
            · {it.by}
          </p>
        </li>
      ))}
      {items.length === 0 ? (
        <li className="text-xs sm:text-sm text-muted-foreground">No activity recorded yet.</li>
      ) : null}
    </ol>
  );
}

function ChainStrip({ steps }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap max-w-full min-w-0">
      {steps.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />}
          <span
            className={cn(
              "rounded-md border px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold whitespace-nowrap",
              s.state === "done"
                ? "border-success/40 bg-success/12 text-success"
                : s.state === "current"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-dashed border-border bg-muted text-muted-foreground"
            )}
          >
            {s.label}
            {s.value ? (
              <span className="ml-1 sm:ml-1.5 font-mono font-normal opacity-80">{s.value}</span>
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
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

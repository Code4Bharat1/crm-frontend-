"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  getInvoices,
  getProformas,
  recordPayment,
  recordProformaAdvance,
  fmtINR,
  fmtDate,
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  CreditCard,
  Building,
  Plus,
  X,
  FileText,
  Filter,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const PAYMENT_MODES = ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "DD", "Credit Note", "Advance Transfer"];
const DOC_TYPES = ["Tax Invoice", "Proforma Advance", "Advance Adjusted"];
const STATUS_OPTIONS = ["Reconciled", "Adjusted", "Advance Recd"];

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This FY (Apr-Mar)", value: "this_fy" },
  { label: "Custom Range", value: "custom" },
];

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState({ type: "invoice", id: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "NEFT", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Filter States
  const [selectedMode, setSelectedMode] = useState("all");
  const [selectedDocType, setSelectedDocType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pi] = await Promise.all([
        getInvoices().catch(() => []),
        getProformas().catch(() => [])
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setProformas(Array.isArray(pi) ? pi : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("action") === "create" || p.get("create") === "true") {
        setSelectedTarget({ type: "invoice", id: "" });
        setPaymentForm({ amount: "", mode: "NEFT", reference: "", notes: "" });
        setShowModal(true);
      }
    }
  }, []);

  // Aggregate all payments across invoices and proformas
  const allReceipts = useMemo(() => {
    const receipts = [];

    // 1. Invoice Payments
    invoices.forEach((inv) => {
      (inv.payments || []).forEach((p, idx) => {
        receipts.push({
          receiptId: `${inv.invoiceNo}-P${idx + 1}`,
          docType: "Tax Invoice",
          docNo: inv.invoiceNo,
          customerName: inv.customer?.name || "—",
          date: p.date || inv.date,
          amount: p.amount || 0,
          mode: p.mode || "NEFT",
          reference: p.reference || "—",
          notes: p.notes || "Invoice Settlement",
          status: "Reconciled",
          link: `/invoices/${inv.invoiceNo}`,
        });
      });

      // If advance adjusted on invoice
      if (inv.advanceAdjusted > 0) {
        receipts.push({
          receiptId: `${inv.invoiceNo}-ADV`,
          docType: "Advance Adjusted",
          docNo: inv.invoiceNo,
          customerName: inv.customer?.name || "—",
          date: inv.date,
          amount: inv.advanceAdjusted,
          mode: "Advance Transfer",
          reference: inv.proformaRef || "Proforma Advance",
          notes: `Adjusted against ${inv.invoiceNo}`,
          status: "Adjusted",
          link: `/invoices/${inv.invoiceNo}`,
        });
      }
    });

    // 2. Proforma Advances
    proformas.forEach((pi) => {
      if (pi.advanceReceived > 0 && !invoices.some(inv => inv.proformaRef === pi.proformaNo)) {
        receipts.push({
          receiptId: `${pi.proformaNo}-ADV`,
          docType: "Proforma Advance",
          docNo: pi.proformaNo,
          customerName: pi.customer?.name || "—",
          date: pi.updatedAt || pi.date,
          amount: pi.advanceReceived,
          mode: "Advance",
          reference: pi.quotationRef || pi.proformaNo,
          notes: "Proforma Advance Received",
          status: "Advance Recd",
          link: `/proformas/${pi.proformaNo}`,
        });
      }
    });

    // Sort latest first
    receipts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return receipts;
  }, [invoices, proformas]);

  // List of unique customers for filter dropdown
  const uniqueCustomers = useMemo(() => {
    const set = new Set();
    allReceipts.forEach((r) => {
      if (r.customerName && r.customerName !== "—") set.add(r.customerName);
    });
    return Array.from(set).sort();
  }, [allReceipts]);

  // Date range verification helper
  const isDateInRange = (dateStr, preset, start, end) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (preset === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return d >= todayStart && d <= todayEnd;
    }
    if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    if (preset === "last_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    if (preset === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    if (preset === "this_fy") {
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const firstDay = new Date(startYear, 3, 1);
      const lastDay = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
      return d >= firstDay && d <= lastDay;
    }
    if (preset === "custom" || start || end) {
      if (start) {
        const s = new Date(start);
        if (d < s) return false;
      }
      if (end) {
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        if (d > e) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered Receipts Calculation
  const filteredReceipts = useMemo(() => {
    return allReceipts.filter((r) => {
      // 1. Payment Mode Filter
      if (selectedMode !== "all" && r.mode !== selectedMode) {
        return false;
      }
      // 2. Document Type Filter
      if (selectedDocType !== "all" && r.docType !== selectedDocType) {
        return false;
      }
      // 3. Status Filter
      if (selectedStatus !== "all" && r.status !== selectedStatus) {
        return false;
      }
      // 4. Customer Filter
      if (selectedCustomer !== "all" && r.customerName !== selectedCustomer) {
        return false;
      }
      // 5. Date Range Filter
      if (!isDateInRange(r.date, datePreset, startDate, endDate)) {
        return false;
      }
      // 6. Amount Range Filter
      if (minAmount && Number(minAmount) > 0 && r.amount < Number(minAmount)) {
        return false;
      }
      if (maxAmount && Number(maxAmount) > 0 && r.amount > Number(maxAmount)) {
        return false;
      }
      return true;
    });
  }, [
    allReceipts,
    selectedMode,
    selectedDocType,
    selectedStatus,
    selectedCustomer,
    datePreset,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMode !== "all") count++;
    if (selectedDocType !== "all") count++;
    if (selectedStatus !== "all") count++;
    if (selectedCustomer !== "all") count++;
    if (datePreset !== "all" || startDate || endDate) count++;
    if (minAmount || maxAmount) count++;
    return count;
  }, [
    selectedMode,
    selectedDocType,
    selectedStatus,
    selectedCustomer,
    datePreset,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  const resetFilters = () => {
    setSelectedMode("all");
    setSelectedDocType("all");
    setSelectedStatus("all");
    setSelectedCustomer("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  const totalCollected = allReceipts.reduce((s, r) => s + (r.amount || 0), 0);
  const filteredCollected = filteredReceipts.reduce((s, r) => s + (r.amount || 0), 0);
  const pendingInvoices = invoices.filter(i => (i.balanceAmount || 0) > 0);

  const handleRecordPayment = async (e) => {
    e?.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      return showToast("Enter a valid payment amount", "error");
    }
    if (!selectedTarget.id) {
      return showToast("Select an Invoice or Proforma", "error");
    }

    setSaving(true);
    try {
      if (selectedTarget.type === "invoice") {
        await recordPayment(selectedTarget.id, paymentForm);
        showToast(`Payment of ₹${paymentForm.amount} recorded for ${selectedTarget.id}!`);
      } else {
        await recordProformaAdvance(selectedTarget.id, { amount: Number(paymentForm.amount) });
        showToast(`Advance of ₹${paymentForm.amount} recorded for ${selectedTarget.id}!`);
      }
      setShowModal(false);
      setPaymentForm({ amount: "", mode: "NEFT", reference: "", notes: "" });
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderMobileCard = (r) => {
    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              {r.receiptId}
            </div>
            <div className="font-semibold text-foreground text-sm truncate mt-0.5">
              {r.customerName}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              {fmtINR(r.amount)}
            </div>
            <StatusBadge value={r.status} className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Document</span>
            <Link
              href={r.link}
              className="font-mono text-xs font-bold hover:underline text-indigo-600 dark:text-indigo-400 truncate block mt-0.5"
            >
              {r.docNo}
            </Link>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Mode</span>
            <span className="font-medium text-foreground mt-0.5 inline-block">{r.mode}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Date</span>
            <span className="text-foreground mt-0.5 inline-block">{fmtDate(r.date)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Ref / UTR</span>
            <span className="font-mono text-foreground truncate mt-0.5 inline-block">{r.reference || "—"}</span>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    {
      header: "Receipt / Ref",
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
          {r.receiptId}
        </span>
      ),
    },
    {
      header: "Customer",
      cell: (r) => (
        <div className="font-semibold text-foreground text-xs sm:text-sm truncate max-w-[180px] lg:max-w-xs">{r.customerName}</div>
      ),
    },
    {
      header: "Document",
      cell: (r) => (
        <Link
          href={r.link}
          className="text-xs font-bold hover:underline text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 font-mono whitespace-nowrap"
        >
          <span>{r.docType}:</span>
          <span>{r.docNo}</span>
        </Link>
      ),
    },
    {
      header: "Date",
      cell: (r) => (
        <span className="text-xs text-foreground whitespace-nowrap font-medium">
          {fmtDate(r.date)}
        </span>
      ),
    },
    {
      header: "Amount",
      cell: (r) => (
        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
          {fmtINR(r.amount)}
        </span>
      ),
    },
    {
      header: "Mode",
      cell: (r) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border/40 whitespace-nowrap">
          {r.mode}
        </span>
      ),
    },
    {
      header: "Reference / UTR",
      cell: (r) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {r.reference || "—"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge value={r.status} />,
    },
  ];

  // Filters Drawer Content (passed to DataTable sheet)
  const filterSheetContent = (
    <div className="space-y-4 text-xs">
      {/* Date Range Preset */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Date Period</Label>
        <select
          value={datePreset}
          onChange={(e) => setDatePreset(e.target.value)}
          className="w-full mt-1.5 h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Range inputs */}
      {datePreset === "custom" && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <Label className="text-[11px] text-muted-foreground">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 h-8.5 text-xs"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 h-8.5 text-xs"
            />
          </div>
        </div>
      )}

      {/* Document Type Filter */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Document Type</Label>
        <select
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="w-full mt-1.5 h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Document Types</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Mode Filter */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Payment Mode</Label>
        <select
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          className="w-full mt-1.5 h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Payment Modes</option>
          {PAYMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Customer Filter */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Customer</Label>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full mt-1.5 h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Customers ({uniqueCustomers.length})</option>
          {uniqueCustomers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Receipt Status</Label>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full mt-1.5 h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Range Filter */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground">Amount Range (₹)</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <Input
            type="number"
            placeholder="Min ₹"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="h-9 text-xs"
          />
          <Input
            type="number"
            placeholder="Max ₹"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Drawer Action Buttons */}
      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetFilters}
          disabled={activeFiltersCount === 0}
          className="h-9 gap-1.5 text-xs rounded-xl cursor-pointer"
        >
          <RotateCcw className="size-3" /> Reset
        </Button>
        <div className="text-[11px] text-muted-foreground font-semibold">
          {filteredReceipts.length} records matching
        </div>
      </div>
    </div>
  );

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 text-foreground animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-base sm:text-lg text-foreground">Record New Payment Receipt</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Document *</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "invoice", id: pendingInvoices[0]?.invoiceNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      selectedTarget.type === "invoice" ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-2xs" : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    Tax Invoice ({pendingInvoices.length} Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "proforma", id: proformas[0]?.proformaNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      selectedTarget.type === "proforma" ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-2xs" : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    Proforma Advance ({proformas.length})
                  </button>
                </div>

                {selectedTarget.type === "invoice" ? (
                  <select
                    required
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={selectedTarget.id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const inv = invoices.find(i => i.invoiceNo === id || i._id === id);
                      setSelectedTarget({ type: "invoice", id });
                      if (inv) setPaymentForm(f => ({ ...f, amount: inv.balanceAmount || "" }));
                    }}
                  >
                    <option value="">Select an invoice…</option>
                    {invoices.map((inv) => (
                      <option key={inv.invoiceNo || inv._id} value={inv.invoiceNo || inv._id}>
                        {inv.invoiceNo} — {inv.customer?.name} (Balance: {fmtINR(inv.balanceAmount)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    value={selectedTarget.id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const pi = proformas.find(p => p.proformaNo === id || p._id === id);
                      setSelectedTarget({ type: "proforma", id });
                      if (pi) setPaymentForm(f => ({ ...f, amount: Math.max(0, (pi.advanceRequired || 0) - (pi.advanceReceived || 0)) }));
                    }}
                  >
                    <option value="">Select a proforma…</option>
                    {proformas.map((pi) => (
                      <option key={pi.proformaNo || pi._id} value={pi.proformaNo || pi._id}>
                        {pi.proformaNo} — {pi.customer?.name} (Advance Reqd: {fmtINR(pi.advanceRequired)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Receipt Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Mode</label>
                  <select
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={paymentForm.mode}
                    onChange={(e) => setPaymentForm(f => ({ ...f, mode: e.target.value }))}
                  >
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Reference / UTR No.</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC12345678"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Recording..." : "Record Payment Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="Finance / Payments"
        title="Payments Received"
        subtitle="Live payment records, advance transfers, and invoice receipts tracked from MongoDB"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setSelectedTarget({ type: "invoice", id: pendingInvoices[0]?.invoiceNo || invoices[0]?.invoiceNo || "" });
              if (pendingInvoices[0]) setPaymentForm(f => ({ ...f, amount: pendingInvoices[0].balanceAmount || "" }));
              setShowModal(true);
            }}
            className="gap-1.5 text-xs sm:text-sm font-semibold h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Record Payment</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Receipts" value={allReceipts.length} />
        <Kpi label="Total Collected" value={fmtINR(totalCollected)} tone="success" />
        <Kpi label="Pending Invoices" value={pendingInvoices.length} tone="warning" />
        <Kpi label="Total Proformas" value={proformas.length} tone="accent" />
      </div>

      {/* Quick Filter Tabs & Interactive Filters Toolbar */}
      <div className="space-y-3 mb-4">
        {/* Quick Document Type Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-1">
          <button
            type="button"
            onClick={() => setSelectedDocType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDocType === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            All Receipts ({allReceipts.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDocType("Tax Invoice")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDocType === "Tax Invoice"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Tax Invoices ({allReceipts.filter(r => r.docType === "Tax Invoice").length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDocType("Proforma Advance")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDocType === "Proforma Advance"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Proforma Advances ({allReceipts.filter(r => r.docType === "Proforma Advance").length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedDocType("Advance Adjusted")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDocType === "Advance Adjusted"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Advance Adjusted ({allReceipts.filter(r => r.docType === "Advance Adjusted").length})
          </button>
        </div>

        {/* Inline Quick Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl border border-border bg-card/60">
          {/* Mode Dropdown */}
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Modes</option>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  Mode: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date Period Dropdown */}
          <div className="relative">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  Date: {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Dropdown */}
          <div className="relative max-w-[200px]">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
            >
              <option value="all">All Customers</option>
              {uniqueCustomers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs if custom selected */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8.5 text-xs w-32"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8.5 text-xs w-32"
              />
            </div>
          )}

          {/* Active Filter Indicator & Reset */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 h-8.5 px-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/30 transition-all cursor-pointer ml-auto"
              title="Clear all active filters"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filters ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Active Filter Pills List */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground text-[11px] font-medium">Applied Filters:</span>
            {selectedDocType !== "all" && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Type: <span className="font-semibold text-foreground">{selectedDocType}</span>
                <button onClick={() => setSelectedDocType("all")} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            {selectedMode !== "all" && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Mode: <span className="font-semibold text-foreground">{selectedMode}</span>
                <button onClick={() => setSelectedMode("all")} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            {selectedCustomer !== "all" && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Customer: <span className="font-semibold text-foreground">{selectedCustomer}</span>
                <button onClick={() => setSelectedCustomer("all")} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            {datePreset !== "all" && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Period: <span className="font-semibold text-foreground">{DATE_PRESETS.find(p => p.value === datePreset)?.label || datePreset}</span>
                <button onClick={() => { setDatePreset("all"); setStartDate(""); setEndDate(""); }} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            {selectedStatus !== "all" && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Status: <span className="font-semibold text-foreground">{selectedStatus}</span>
                <button onClick={() => setSelectedStatus("all")} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            {(minAmount || maxAmount) && (
              <Badge variant="outline" className="gap-1 bg-muted/60 text-xs py-0.5 px-2 rounded-lg font-normal">
                Amount: <span className="font-semibold text-foreground">₹{minAmount || "0"} - ₹{maxAmount || "∞"}</span>
                <button onClick={() => { setMinAmount(""); setMaxAmount(""); }} className="hover:text-destructive cursor-pointer ml-0.5">✕</button>
              </Badge>
            )}
            <span className="text-muted-foreground text-[11px] ml-auto">
              Showing <strong>{filteredReceipts.length}</strong> of {allReceipts.length} records · Collection: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fmtINR(filteredCollected)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredReceipts}
            columns={columns}
            mobileCard={renderMobileCard}
            filters={filterSheetContent}
            searchKeys={["receiptId", "customerName", "docNo", "reference", "mode", "notes"]}
          />
        )}
      </div>
    </>
  );
}

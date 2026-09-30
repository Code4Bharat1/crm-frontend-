"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getInvoices, getProformas, recordPayment, recordProformaAdvance, fmtINR, fmtDate } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";

const PAYMENT_MODES = ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "DD", "Credit Note"];

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState({ type: "invoice", id: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "NEFT", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

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
  const allReceipts = [];

  // 1. Invoice Payments
  invoices.forEach((inv) => {
    (inv.payments || []).forEach((p, idx) => {
      allReceipts.push({
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
      allReceipts.push({
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

  // 2. Proforma Advances (that aren't already converted or listed)
  proformas.forEach((pi) => {
    if (pi.advanceReceived > 0 && !invoices.some(inv => inv.proformaRef === pi.proformaNo)) {
      allReceipts.push({
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
  allReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalCollected = allReceipts.reduce((s, r) => s + (r.amount || 0), 0);
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
            <span className="font-bold text-sm text-blue-600 dark:text-blue-400 font-mono">
              {r.receiptId}
            </span>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {r.customerName}
            </p>
            <Link
              href={r.link}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono hover:underline inline-flex items-center gap-1 mt-0.5"
            >
              <span>{r.docType}:</span>
              <strong className="text-foreground">{r.docNo}</strong>
            </Link>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={r.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(r.date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Amount Recd
            </span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
              {fmtINR(r.amount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Mode
            </span>
            <span className="font-medium text-foreground text-xs">{r.mode}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Reference
            </span>
            <span className="font-mono text-muted-foreground text-xs truncate block">
              {r.reference || "—"}
            </span>
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
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Document *</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "invoice", id: pendingInvoices[0]?.invoiceNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      selectedTarget.type === "invoice" ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-2xs" : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    Tax Invoice ({pendingInvoices.length} Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "proforma", id: proformas[0]?.proformaNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      selectedTarget.type === "proforma" ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-2xs" : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    Proforma Advance ({proformas.length})
                  </button>
                </div>

                {selectedTarget.type === "invoice" ? (
                  <select
                    required
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-purple-500"
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
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs disabled:opacity-60"
                >
                  {saving ? "Recording..." : "Record Payment Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Finance / Payments"
        title="Payments Received"
        subtitle="Live payment records, advance transfers, and invoice receipts tracked from MongoDB"
        actions={
          <button
            onClick={() => {
              setSelectedTarget({ type: "invoice", id: pendingInvoices[0]?.invoiceNo || invoices[0]?.invoiceNo || "" });
              if (pendingInvoices[0]) setPaymentForm(f => ({ ...f, amount: pendingInvoices[0].balanceAmount || "" }));
              setShowModal(true);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            + Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Receipts" value={allReceipts.length} />
        <Kpi label="Total Collected" value={fmtINR(totalCollected)} tone="success" />
        <Kpi label="Pending Invoices" value={pendingInvoices.length} tone="warning" />
        <Kpi label="Total Proformas" value={proformas.length} tone="accent" />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={allReceipts}
            columns={columns}
            mobileCard={renderMobileCard}
            searchKeys={["receiptId", "customerName", "docNo", "reference", "mode"]}
          />
        )}
      </div>
    </>
  );
}

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

  const columns = [
    {
      header: "Receipt / Ref",
      cell: (r) => <span className="font-mono text-xs font-bold text-blue-600">{r.receiptId}</span>,
    },
    {
      header: "Customer",
      cell: (r) => <span className="font-semibold text-gray-900">{r.customerName}</span>,
    },
    {
      header: "Document",
      cell: (r) => (
        <Link href={r.link} className="text-xs font-bold hover:underline text-indigo-600 flex items-center gap-1">
          <span>{r.docType}:</span>
          <span>{r.docNo}</span>
        </Link>
      ),
    },
    {
      header: "Date",
      cell: (r) => fmtDate(r.date),
    },
    {
      header: "Amount",
      cell: (r) => <span className="font-bold text-emerald-600 text-sm">{fmtINR(r.amount)}</span>,
    },
    {
      header: "Mode",
      cell: (r) => <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">{r.mode}</span>,
    },
    {
      header: "Reference / UTR",
      cell: (r) => <span className="font-mono text-xs text-gray-500">{r.reference}</span>,
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
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-lg text-gray-900">Record New Payment Receipt</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Document *</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "invoice", id: pendingInvoices[0]?.invoiceNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      selectedTarget.type === "invoice" ? "bg-red-50 border-red-500 text-red-700 shadow-sm" : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    Tax Invoice ({pendingInvoices.length} Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget({ type: "proforma", id: proformas[0]?.proformaNo || "" })}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      selectedTarget.type === "proforma" ? "bg-purple-50 border-purple-500 text-purple-700 shadow-sm" : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    Proforma Advance ({proformas.length})
                  </button>
                </div>

                {selectedTarget.type === "invoice" ? (
                  <select
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  className="w-full border rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    value={paymentForm.mode}
                    onChange={(e) => setPaymentForm(f => ({ ...f, mode: e.target.value }))}
                  >
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / UTR No.</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC12345678"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow disabled:opacity-60"
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Receipts" value={allReceipts.length} />
        <Kpi label="Total Collected" value={fmtINR(totalCollected)} tone="success" />
        <Kpi label="Pending Invoices" value={pendingInvoices.length} tone="warning" />
        <Kpi label="Total Proformas" value={proformas.length} tone="accent" />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={allReceipts}
            columns={columns}
            searchKeys={["receiptId", "customerName", "docNo", "reference", "mode"]}
          />
        )}
      </div>
    </>
  );
}

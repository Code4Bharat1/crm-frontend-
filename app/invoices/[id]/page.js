"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getInvoice, getCompany, recordPayment, fmtINR, fmtDate } from "@/services/documentService";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { PageHeader, StatusBadge } from "@/components/crm-ui";
import Link from "next/link";

const PAYMENT_MODES = ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "DD", "Credit Note"];

function InfoCard({ label, children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "NEFT", reference: "", notes: "" });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getInvoice(id), getCompany().catch(() => null)]);
      setDoc(d);
      setCompany(c);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePayment = async () => {
    if (!paymentForm.amount) return;
    try {
      await recordPayment(id, paymentForm);
      showToast("Payment recorded");
      setShowPayment(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Invoice not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Sales Invoice" company={company} onClose={() => setPrinting(false)} />}
      
      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-3xl p-6 sm:p-7 w-[94vw] max-w-sm sm:max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3.5 border border-emerald-500/20">
              💳
            </div>
            <h3 className="font-bold text-lg sm:text-xl mb-1 text-gray-900 text-center">Record Payment</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center">
              Record payment receipt for Invoice <strong className="text-gray-900 font-bold">{doc.invoiceNo}</strong>
            </p>

            <div className="bg-gray-50 border rounded-2xl p-3.5 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold text-gray-900 truncate max-w-[200px]">{doc.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Invoice Total:</span>
                <span className="font-bold text-gray-900">{fmtINR(doc.grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Balance Due:</span>
                <span className="font-bold text-rose-600">{fmtINR(doc.balanceAmount)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mode</label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    value={paymentForm.mode}
                    onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}
                  >
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reference No.</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2 text-xs font-mono"
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="UTR / Cheque"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="flex-1 py-2.5 sm:py-3 px-4 border rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 text-gray-700 transition-all cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handlePayment}
                className="flex-1 py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Yes, Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Tax Invoices" title={doc.invoiceNo} subtitle={`Customer: ${doc.customer?.name} · ${fmtDate(doc.date)}`} />
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium">🖨 Print / PDF</button>
        {doc.status !== "Paid" && doc.status !== "Cancelled" && (
          <button onClick={() => { setShowPayment(true); setPaymentForm({ amount: doc.balanceAmount || "", mode: "NEFT", reference: "", notes: "" }); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            ₹ Record Payment
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Grand Total"><span className="text-2xl font-bold text-red-600">{fmtINR(doc.grandTotal)}</span></InfoCard>
        <InfoCard label="Amount Received"><span className="text-green-600 font-bold text-lg">{fmtINR(doc.receivedAmount)}</span></InfoCard>
        <InfoCard label="Balance Due">
          <span className={`font-bold text-lg ${doc.balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>
            {doc.balanceAmount > 0 ? fmtINR(doc.balanceAmount) : "PAID ✓"}
          </span>
        </InfoCard>
        <InfoCard label="Due Date">{fmtDate(doc.dueDate)}</InfoCard>
        <InfoCard label="Payment Terms">{doc.paymentTerms}</InfoCard>
        {doc.soRef && (
          <InfoCard label="Sales Order">
            <Link href={`/orders/${doc.soRef}`} className="text-green-600 font-semibold hover:underline">{doc.soRef}</Link>
          </InfoCard>
        )}
        {doc.proformaRef && (
          <InfoCard label="Proforma">
            <Link href={`/proformas/${doc.proformaRef}`} className="text-purple-600 font-semibold hover:underline">{doc.proformaRef}</Link>
          </InfoCard>
        )}
      </div>

      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Sales Invoice" company={company} embedded={true} />
          </div>
        </div>
      )}
    </>
  );
}

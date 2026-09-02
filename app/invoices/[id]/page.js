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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Record Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Mode</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reference</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowPayment(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handlePayment} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">Record</button>
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
            <DocumentPrintView doc={doc} type="Sales Invoice" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

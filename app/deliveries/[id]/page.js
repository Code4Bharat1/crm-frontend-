"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDeliveryNote, getCompany, markDelivered, createInvoiceFromDN, fmtDate } from "@/services/documentService";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { PageHeader, StatusBadge } from "@/components/crm-ui";
import Link from "next/link";

function InfoCard({ label, children }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export default function DeliveryNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receivedBy, setReceivedBy] = useState("");
  const [showDeliver, setShowDeliver] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getDeliveryNote(id), getCompany().catch(() => null)]);
      setDoc(d);
      setCompany(c);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDeliver = async () => {
    try {
      await markDelivered(id, { receivedBy, deliveryDate: new Date() });
      showToast("Marked as Delivered");
      setShowDeliver(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const inv = await createInvoiceFromDN(id);
      showToast(`Tax Invoice ${inv.invoiceNo} generated!`);
      load();
      router.push(`/invoices/${inv.invoiceNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Delivery Note not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Delivery Note" company={company} onClose={() => setPrinting(false)} />}
      
      {showDeliver && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Confirm Delivery</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Received By</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Name of receiver" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeliver(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleDeliver} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Delivery Notes" title={doc.dnNo} subtitle={`Customer: ${doc.customer?.name} · SO: ${doc.soRef} · ${fmtDate(doc.date)}`} />
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
          🖨 Print / PDF
        </button>
        <Link href="/deliveries" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
          ← Back to Deliveries
        </Link>
        {doc.invoiceRef ? (
          <Link
            href={`/invoices/${doc.invoiceRef}`}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>👁 View Tax Invoice</span>
            <span className="font-mono text-xs">({doc.invoiceRef})</span>
          </Link>
        ) : (
          <>
            {doc.status !== "Delivered" && (
              <button onClick={() => setShowDeliver(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                ✓ Mark Delivered
              </button>
            )}
            <button onClick={handleConvertToInvoice} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow hover:bg-red-700 transition-all flex items-center gap-1.5">
              🧾 Convert to Tax Invoice
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Sales Order">
          <Link href={`/orders/${doc.soRef}`} className="text-green-600 font-semibold hover:underline">{doc.soRef}</Link>
        </InfoCard>
        <InfoCard label="Invoice Reference">
          {doc.invoiceRef ? (
            <Link href={`/invoices/${doc.invoiceRef}`} className="text-red-600 font-bold hover:underline">
              {doc.invoiceRef}
            </Link>
          ) : (
            <span className="text-gray-400">Not Invoiced Yet</span>
          )}
        </InfoCard>
        <InfoCard label="Transporter">{doc.transporter || "—"}</InfoCard>
        <InfoCard label="LR Number">{doc.lrNumber || "—"}</InfoCard>
        <InfoCard label="Dispatch Date">{fmtDate(doc.dispatchDate)}</InfoCard>
        <InfoCard label="Expected">{fmtDate(doc.expectedDelivery)}</InfoCard>
        {doc.deliveryDate && <InfoCard label="Delivered On">{fmtDate(doc.deliveryDate)}</InfoCard>}
        {doc.receivedBy && <InfoCard label="Received By">{doc.receivedBy}</InfoCard>}
      </div>

      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Delivery Note" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

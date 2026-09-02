"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getPurchaseOrder, getCompany, markPOReceived, fmtINR, fmtDate } from "@/services/documentService";
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

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getPurchaseOrder(id), getCompany().catch(() => null)]);
      setDoc(d);
      setCompany(c);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleMarkReceived = async () => {
    try {
      await markPOReceived(id, { items: doc.items.map((_, i) => ({ index: i, receivedQty: doc.items[i].qty })) });
      showToast("PO marked as Received");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-cyan-200 border-t-cyan-700 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Purchase Order not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Purchase Order" company={company} onClose={() => setPrinting(false)} />}

      <PageHeader breadcrumb="Purchase / Purchase Orders" title={doc.poNo} subtitle={`Supplier: ${doc.supplier?.name} · ${fmtDate(doc.date)}`} />
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium">🖨 Print / PDF</button>
        {!["Received", "Closed", "Cancelled"].includes(doc.status) && (
          <button onClick={handleMarkReceived} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            ✓ Mark All Received
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Grand Total"><span className="text-2xl font-bold text-cyan-700">{fmtINR(doc.grandTotal)}</span></InfoCard>
        <InfoCard label="Expected Delivery">{fmtDate(doc.expectedDelivery)}</InfoCard>
        <InfoCard label="Payment Terms">{doc.paymentTerms}</InfoCard>
        {doc.soRef && (
          <InfoCard label="Sales Order">
            <Link href={`/orders/${doc.soRef}`} className="text-green-600 font-semibold hover:underline">{doc.soRef}</Link>
          </InfoCard>
        )}
        {doc.projectRef && <InfoCard label="Project">{doc.projectRef}</InfoCard>}
      </div>

      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Purchase Order" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

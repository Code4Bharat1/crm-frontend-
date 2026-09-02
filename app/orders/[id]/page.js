"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSalesOrder, getCompany, createDNFromSO, createInvoiceFromSO, fmtINR, fmtDate } from "@/services/documentService";
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

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getSalesOrder(id), getCompany().catch(() => null)]);
      setDoc(d);
      setCompany(c);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCreateDN = async () => {
    try {
      const dn = await createDNFromSO(id, {});
      showToast(`DN ${dn.dnNo} created`);
      router.push(`/deliveries/${dn.dnNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const inv = await createInvoiceFromSO(id, {});
      showToast(`Invoice ${inv.invoiceNo} created`);
      router.push(`/invoices/${inv.invoiceNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Sales Order not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Sales Order" company={company} onClose={() => setPrinting(false)} />}

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">🖨 Print / PDF</button>
        <Link href="/orders" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">← Back to Orders</Link>
        
        {doc.deliveryNotes && doc.deliveryNotes.length > 0 ? (
          <Link
            href={`/deliveries/${doc.deliveryNotes[0]}`}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>👁 View Delivery Note</span>
            <span className="font-mono text-xs">({doc.deliveryNotes[0]})</span>
          </Link>
        ) : (
          <button onClick={handleCreateDN} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
            → Create Delivery Note
          </button>
        )}

        {doc.invoices && doc.invoices.length > 0 ? (
          <Link
            href={`/invoices/${doc.invoices[0]}`}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>👁 View Invoice</span>
            <span className="font-mono text-xs">({doc.invoices[0]})</span>
          </Link>
        ) : (
          (!doc.deliveryNotes || doc.deliveryNotes.length === 0) && (
            <button onClick={handleCreateInvoice} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
              → Create Invoice
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Grand Total"><span className="text-2xl font-bold text-green-600">{fmtINR(doc.grandTotal)}</span></InfoCard>
        <InfoCard label="Expected Delivery">{fmtDate(doc.expectedDelivery)}</InfoCard>
        <InfoCard label="Customer PO">{doc.poReference || "—"}</InfoCard>
        {doc.quotationRef && (
          <InfoCard label="Quotation">
            <Link href={`/quotations/${doc.quotationRef}`} className="text-blue-600 font-semibold hover:underline">{doc.quotationRef}</Link>
          </InfoCard>
        )}
        {doc.proformaRef && (
          <InfoCard label="Proforma">
            <Link href={`/proformas/${doc.proformaRef}`} className="text-purple-600 font-semibold hover:underline">{doc.proformaRef}</Link>
          </InfoCard>
        )}
        {(doc.deliveryNotes || []).map((d) => (
          <InfoCard key={d} label="Delivery Note">
            <Link href={`/deliveries/${d}`} className="text-orange-600 font-semibold hover:underline">{d}</Link>
          </InfoCard>
        ))}
        {(doc.invoices || []).map((inv) => (
          <InfoCard key={inv} label="Invoice">
            <Link href={`/invoices/${inv}`} className="text-red-600 font-semibold hover:underline">{inv}</Link>
          </InfoCard>
        ))}
      </div>

      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Sales Order" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

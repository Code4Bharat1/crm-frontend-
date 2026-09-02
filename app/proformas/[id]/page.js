"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProforma, getCompany, recordProformaAdvance, convertProformaToSO, fmtINR, fmtDate } from "@/services/documentService";
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

export default function ProformaDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [showAdvance, setShowAdvance] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([getProforma(id), getCompany().catch(() => null)]);
      setDoc(d);
      setCompany(c);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAdvance = async () => {
    try {
      await recordProformaAdvance(id, { amount: Number(advanceAmount) });
      showToast("Advance recorded");
      setShowAdvance(false);
      setAdvanceAmount("");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToSO = async () => {
    try {
      const so = await convertProformaToSO(id, {});
      showToast(`Sales Order ${so.soNo} created`);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Proforma not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Proforma Invoice" company={company} onClose={() => setPrinting(false)} />}
      
      {showAdvance && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Record Advance</h3>
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mb-4" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="Amount in ₹" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowAdvance(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleAdvance} className="flex-1 bg-yellow-500 text-white rounded-lg py-2 text-sm font-medium">Record</button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Proforma Invoices" title={doc.proformaNo} subtitle={`Customer: ${doc.customer?.name} · ${fmtDate(doc.date)}`} />
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">🖨 Print / PDF</button>
        <Link href="/proformas" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">← Back to Proformas</Link>
        {doc.convertedToSalesOrder || doc.status === "Converted" ? (
          <Link
            href={`/orders/${doc.convertedToSalesOrder}`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>👁 View Sales Order</span>
            {doc.convertedToSalesOrder && <span className="font-mono text-xs">({doc.convertedToSalesOrder})</span>}
          </Link>
        ) : (
          <>
            <button onClick={() => setShowAdvance(true)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors">+ Record Advance</button>
            <button onClick={handleConvertToSO} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">→ Create Sales Order</button>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Grand Total"><span className="text-2xl font-bold text-purple-600">{fmtINR(doc.grandTotal)}</span></InfoCard>
        <InfoCard label="Advance Required">{fmtINR(doc.advanceRequired)}</InfoCard>
        <InfoCard label="Advance Received">
          <span className={doc.advanceReceived >= doc.advanceRequired && doc.advanceRequired > 0 ? "text-green-600 font-bold text-lg" : ""}>
            {fmtINR(doc.advanceReceived)}
          </span>
        </InfoCard>
        {doc.quotationRef && (
          <InfoCard label="Quotation Ref">
            <Link href={`/quotations/${doc.quotationRef}`} className="text-blue-600 font-semibold hover:underline">{doc.quotationRef}</Link>
          </InfoCard>
        )}
        {doc.convertedToSalesOrder && (
          <InfoCard label="Sales Order">
            <Link href={`/orders/${doc.convertedToSalesOrder}`} className="text-green-600 font-semibold hover:underline">{doc.convertedToSalesOrder}</Link>
          </InfoCard>
        )}
      </div>

      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Proforma Invoice" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuotation, getCompany, convertQuotationToProforma, convertQuotationToSO, fmtINR, fmtDate } from "@/services/documentService";
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

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPIModal, setShowPIModal] = useState(false);
  const [advanceRequiredInput, setAdvanceRequiredInput] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([getQuotation(id), getCompany().catch(() => null)])
      .then(([q, c]) => { setDoc(q); setCompany(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleConvertToProforma = async () => {
    try {
      const pi = await convertQuotationToProforma(id, { advanceRequired: Number(advanceRequiredInput) || 0 });
      showToast(`Proforma ${pi.proformaNo} created`);
      setShowPIModal(false);
      router.push(`/proformas/${pi.proformaNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToSO = async () => {
    try {
      const so = await convertQuotationToSO(id, {});
      showToast(`Sales Order ${so.soNo} created`);
      router.push(`/orders/${so.soNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" /></div>;
  if (!doc) return <div className="text-center py-20 text-gray-400">Quotation not found</div>;

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printing && company && <DocumentPrintView doc={doc} type="Quotation" company={company} onClose={() => setPrinting(false)} />}

      {/* Convert to Proforma Modal */}
      {showPIModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl border">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Create Proforma Invoice</h3>
            <p className="text-xs text-gray-500 mb-4">
              Quotation: <strong>{doc.quotationNo}</strong> · Total: <strong>{fmtINR(doc.grandTotal)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Advance Amount Required (₹)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                value={advanceRequiredInput}
                onChange={e => setAdvanceRequiredInput(e.target.value)}
                placeholder="e.g. 10000 (or 0 for none)"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Specify advance requirement or leave 0</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowPIModal(false)} className="flex-1 border rounded-lg py-2 text-xs font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleConvertToProforma} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-xs font-bold shadow">
                Create PI
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Quotations" title={doc.quotationNo} subtitle={`Customer: ${doc.customer?.name} · ${fmtDate(doc.date)}`} />

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPrinting(true)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">🖨 Print / PDF</button>
        <Link href="/quotations" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">← Back to Quotations</Link>
        {doc.convertedToProforma ? (
          <Link href={`/proformas/${doc.convertedToProforma}`} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <span>👁 View Proforma</span>
            <span className="font-mono text-xs">({doc.convertedToProforma})</span>
          </Link>
        ) : doc.convertedToSalesOrder ? (
          <Link href={`/orders/${doc.convertedToSalesOrder}`} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <span>👁 View Sales Order</span>
            <span className="font-mono text-xs">({doc.convertedToSalesOrder})</span>
          </Link>
        ) : (
          <>
            <button onClick={() => { setAdvanceRequiredInput(""); setShowPIModal(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              → Create Proforma
            </button>
            <button onClick={handleConvertToSO} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              → Create Sales Order
            </button>
          </>
        )}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status"><StatusBadge value={doc.status} /></InfoCard>
        <InfoCard label="Grand Total"><span className="text-2xl font-bold text-blue-600">{fmtINR(doc.grandTotal)}</span></InfoCard>
        <InfoCard label="Valid Until">{fmtDate(doc.validUntil)}</InfoCard>
        <InfoCard label="Salesperson">{doc.salesperson || "—"}</InfoCard>
        {doc.convertedToProforma && (
          <InfoCard label="Proforma">
            <Link href={`/proformas/${doc.convertedToProforma}`} className="text-purple-600 font-semibold hover:underline">{doc.convertedToProforma}</Link>
          </InfoCard>
        )}
        {doc.convertedToSalesOrder && (
          <InfoCard label="Sales Order">
            <Link href={`/orders/${doc.convertedToSalesOrder}`} className="text-green-600 font-semibold hover:underline">{doc.convertedToSalesOrder}</Link>
          </InfoCard>
        )}
      </div>

      {/* Embedded Document Preview */}
      {company && (
        <div className="border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium">Document Preview</div>
          <div className="bg-white p-4">
            <DocumentPrintView doc={doc} type="Quotation" company={company} onClose={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}

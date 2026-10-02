"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [showAdvance, setShowAdvance] = useState(false);
  const [showSOModal, setShowSOModal] = useState(false);
  const [convertingSO, setConvertingSO] = useState(false);
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

  const confirmConvertToSO = async () => {
    setConvertingSO(true);
    try {
      const so = await convertProformaToSO(id, {});
      showToast(`Sales Order ${so.soNo} created successfully!`);
      setShowSOModal(false);
      router.push(`/orders/${so.soNo}`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setConvertingSO(false);
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

      {/* Convert to Sales Order Confirmation Modal */}
      {showSOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-card bg-white border border-border rounded-2xl p-5 sm:p-6 w-[94vw] max-w-sm sm:max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3 border border-emerald-500/20">
              🛒
            </div>
            <h3 className="font-bold text-base sm:text-lg text-gray-900 text-center mb-1">
              Convert to Sales Order?
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-4">
              Are you sure you want to convert Proforma Invoice <strong className="text-gray-900">{doc.proformaNo}</strong> into a confirmed Sales Order?
            </p>

            <div className="bg-gray-50 border rounded-xl p-3.5 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Customer:</span>
                <span className="font-semibold text-gray-900 truncate max-w-[200px]">{doc.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Grand Total:</span>
                <span className="font-bold text-gray-900">{fmtINR(doc.grandTotal)}</span>
              </div>
              {doc.advanceRequired > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Advance Required:</span>
                  <span className="font-semibold text-purple-600">{fmtINR(doc.advanceRequired)}</span>
                </div>
              )}
              {doc.advanceReceived > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Advance Received:</span>
                  <span className="font-semibold text-emerald-600">{fmtINR(doc.advanceReceived)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={convertingSO}
                onClick={() => setShowSOModal(false)}
                className="flex-1 py-2.5 px-4 border rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={convertingSO}
                onClick={confirmConvertToSO}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {convertingSO ? "Converting..." : "Yes, Convert to SO"}
              </button>
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
            <button onClick={() => setShowSOModal(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">→ Create Sales Order</button>
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
            <DocumentPrintView doc={doc} type="Proforma Invoice" company={company} embedded={true} />
          </div>
        </div>
      )}
    </>
  );
}


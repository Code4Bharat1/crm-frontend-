"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getProformas, createProforma, updateProforma, deleteProforma,
  recordProformaAdvance, convertProformaToSO,
  calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const emptyForm = {
  customer: { id: "", name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  quotationRef: "", subject: "", salesperson: "", validUntil: "", notes: "", termsAndConditions: "",
  isInterState: false, status: "Draft", advanceRequired: 0,
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

export default function ProformasPage() {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [advanceModal, setAdvanceModal] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pi, c, cust] = await Promise.all([
        getProformas(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => [])
      ]);
      setProformas(pi);
      setCompany(c);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch { /**/ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recalc = (items, isInterState) => items.map(i => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const isInterState = (c.address?.state || "").toLowerCase() !== "maharashtra";
    setForm(f => ({
      ...f,
      isInterState,
      customer: {
        id: c._id || c.id,
        name: c.name,
        address: [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", "),
        gstNumber: c.gstNumber || "",
        state: c.address?.state || "",
        contactPerson: c.contactPerson?.name || "",
        email: c.contactPerson?.email || "",
        phone: c.contactPerson?.phone || ""
      },
      items: recalc(f.items, isInterState),
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    const isInterState = !!p.isInterState;
    setForm({
      ...emptyForm,
      ...p,
      customer: {
        id: p.customer?.id || p.customer?._id || "",
        name: p.customer?.name || "",
        address: p.customer?.address || "",
        gstNumber: p.customer?.gstNumber || "",
        state: p.customer?.state || "",
        contactPerson: p.customer?.contactPerson || "",
        email: p.customer?.email || "",
        phone: p.customer?.phone || "",
      },
      items: (p.items || []).map(item => calcItem(item, isInterState)),
      advanceRequired: p.advanceRequired ?? 0,
    });
    setEditingId(p.proformaNo || p._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer?.name) return showToast("Customer name required", "error");
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...calcTotals(form.items, form.isInterState),
        advanceRequired: Number(form.advanceRequired) || 0
      };
      if (editingId) {
        await updateProforma(editingId, payload);
        showToast("Proforma updated");
      } else {
        await createProforma(payload);
        showToast("Proforma created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this proforma?")) return;
    try {
      await deleteProforma(id);
      showToast("Deleted");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleRecordAdvance = async () => {
    if (!advanceAmount || Number(advanceAmount) <= 0) return showToast("Enter a valid advance amount", "error");
    try {
      await recordProformaAdvance(advanceModal.proformaNo || advanceModal._id, { amount: Number(advanceAmount) });
      showToast("Advance payment recorded");
      setAdvanceModal(null);
      setAdvanceAmount("");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToSO = async (p) => {
    try {
      const so = await convertProformaToSO(p.proformaNo || p._id, {});
      showToast(`Sales Order ${so.soNo} created`);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const totalValue = proformas.reduce((s, p) => s + (p.grandTotal || 0), 0);
  const totalAdvance = proformas.reduce((s, p) => s + (p.advanceReceived || 0), 0);
  const open = proformas.filter(p => ["Draft", "Sent", "Advance Received", "Partially Paid"].includes(p.status)).length;
  const converted = proformas.filter(p => p.status === "Converted").length;

  const columns = [
    { header: "Proforma", cell: (p) => <Link href={`/proformas/${p.proformaNo || p._id}`} className="font-bold text-purple-600 hover:underline">{p.proformaNo}</Link> },
    {
      header: "Customer",
      cell: (p) => (
        <div>
          <div className="font-medium text-gray-900">{p.customer?.name}</div>
          {p.quotationRef && <div className="text-xs text-gray-400">Ref: {p.quotationRef}</div>}
        </div>
      )
    },
    { header: "Date", cell: (p) => fmtDate(p.date) },
    { header: "Value", cell: (p) => <span className="font-bold">{fmtINR(p.grandTotal)}</span> },
    { header: "Advance Reqd", cell: (p) => fmtINR(p.advanceRequired || 0) },
    {
      header: "Advance Recd",
      cell: (p) => (
        <span className={p.advanceReceived >= p.advanceRequired && p.advanceRequired > 0 ? "text-green-600 font-bold" : p.advanceReceived > 0 ? "text-yellow-600 font-medium" : "text-gray-400"}>
          {fmtINR(p.advanceReceived || 0)}
        </span>
      )
    },
    { header: "Status", cell: (p) => <StatusBadge value={p.status} /> },
    {
      header: "Actions", cell: (p) => {
        const isConverted = p.status === "Converted" || !!p.convertedToSalesOrder;
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setPrintDoc(p)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">🖨 Print</button>
            {isConverted ? (
              <Link
                href={`/orders/${p.convertedToSalesOrder || ""}`}
                className="px-2.5 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>👁 View SO</span>
                {p.convertedToSalesOrder && <span className="font-mono text-[11px]">({p.convertedToSalesOrder})</span>}
              </Link>
            ) : (
              <>
                <button onClick={() => openEdit(p)} className="px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-medium">Edit</button>
                <button onClick={() => { setAdvanceModal(p); setAdvanceAmount(""); }} className="px-2 py-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded font-medium">+ Advance</button>
                <button onClick={() => handleConvertToSO(p)} className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium">→ SO</button>
              </>
            )}
            <button onClick={() => handleDelete(p.proformaNo || p._id)} className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded font-medium">Del</button>
          </div>
        );
      }
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Proforma Invoice" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Advance Modal */}
      {advanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Record Advance Payment</h3>
            <p className="text-sm text-gray-500 mb-4">{advanceModal.proformaNo} — {advanceModal.customer?.name}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Advance Amount Received (₹) *</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                value={advanceAmount}
                onChange={e => setAdvanceAmount(e.target.value)}
                placeholder="e.g. 5000"
                autoFocus
              />
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setAdvanceModal(null)} className="flex-1 border rounded-lg py-2 text-xs font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecordAdvance} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg py-2 text-xs font-bold shadow">Record Advance</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Proforma Invoice" : "New Proforma Invoice"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white mb-1.5"
                      value={form.customer?.id || customers.find(c => c.name === form.customer?.name)?._id || customers.find(c => c.name === form.customer?.name)?.id || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">Select from customer master…</option>
                      {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.id || "CUST"})</option>)}
                    </select>
                  )}
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm font-medium"
                    value={form.customer?.name || ""}
                    onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Quotation Reference</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.quotationRef || ""} onChange={e => setForm(f => ({ ...f, quotationRef: e.target.value }))} placeholder="QT-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Advance Amount Required (₹)</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold"
                    value={form.advanceRequired ?? 0}
                    onChange={e => setForm(f => ({ ...f, advanceRequired: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Salesperson</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.salesperson || ""} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Valid Until</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validUntil ? form.validUntil.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Advance Received", "Partially Paid", "Converted", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="piInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="piInterState" className="text-sm font-medium text-gray-700">Inter-State supply (IGST)</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Line Items</label>
                <LineItemsEditor items={form.items} isInterState={form.isInterState} onChange={items => setForm(f => ({ ...f, items: items.map(i => calcItem(i, f.isInterState)) }))} />
              </div>
              <div className="flex justify-end">
                <div className="bg-gray-50 border rounded-xl px-5 py-4 min-w-60 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Grand Total</span><span className="text-purple-600">{fmtINR(totals.grandTotal)}</span></div>
                  {Number(form.advanceRequired) > 0 && (
                    <div className="flex justify-between font-medium text-amber-700 pt-1">
                      <span>Advance Required</span>
                      <span>{fmtINR(form.advanceRequired)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Proforma" : "Create Proforma"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Proforma Invoices" title="Proforma Invoices" subtitle="Commercial estimates with advance payment terms and order conversion" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Proformas" value={proformas.length} />
        <Kpi label="Open" value={open} tone="warning" />
        <Kpi label="Converted to SO" value={converted} tone="success" />
        <Kpi label="Advance Collected" value={fmtINR(totalAdvance)} tone="accent" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Proforma</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" /></div> : (
        <DataTable rows={proformas} columns={columns} searchKeys={["proformaNo", "customer.name", "quotationRef", "status"]} />
      )}
    </>
  );
}

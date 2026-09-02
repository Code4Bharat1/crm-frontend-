"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, markPOReceived,
  getSuppliers, calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const emptyForm = {
  supplier: { name: "", address: "", gstNumber: "", contactPerson: "", email: "", phone: "" },
  soRef: "", projectRef: "", deliveryAddress: "",
  paymentTerms: "30 Days Net", notes: "", termsAndConditions: "",
  isInterState: false, status: "Draft", expectedDelivery: "",
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [po, c, sup] = await Promise.all([getPurchaseOrders(), getCompany().catch(() => null), getSuppliers().catch(() => [])]);
      setOrders(po); setCompany(c); setSuppliers(Array.isArray(sup) ? sup : []);
    } catch { /**/ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recalc = (items, isInterState) => items.map(i => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleSupplierSelect = (supId) => {
    const s = suppliers.find(s => s._id === supId || s.id === supId);
    if (!s) return;
    setForm(f => ({ ...f, supplier: { id: s._id || s.id, name: s.name, address: [s.address?.street, s.address?.city, s.address?.state, s.address?.pinCode].filter(Boolean).join(", "), gstNumber: s.gstNumber || "", contactPerson: s.contactPerson || "", email: s.email || "", phone: s.phone || "" } }));
  };

  const handleSave = async () => {
    if (!form.supplier.name) return showToast("Supplier required", "error");
    setSaving(true);
    try {
      const payload = { ...form, ...calcTotals(form.items, form.isInterState) };
      if (editingId) { await updatePurchaseOrder(editingId, payload); showToast("Purchase Order updated"); }
      else { await createPurchaseOrder(payload); showToast("Purchase Order created"); }
      setShowForm(false); load();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this PO?")) return;
    try { await deletePurchaseOrder(id); showToast("Deleted"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleMarkReceived = async (po) => {
    try { await markPOReceived(po.poNo || po._id, { items: po.items.map((_, i) => ({ index: i, receivedQty: po.items[i].qty })) }); showToast("PO marked as Received"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const totalValue = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const pending = orders.filter(o => ["Sent", "Acknowledged", "Partially Received"].includes(o.status)).length;
  const received = orders.filter(o => o.status === "Received").length;

  const columns = [
    { header: "PO No.", cell: (p) => <Link href={`/purchase/${p.poNo || p._id}`} className="font-bold text-cyan-700 hover:underline">{p.poNo}</Link> },
    { header: "Supplier", cell: (p) => <div><div className="font-medium">{p.supplier?.name}</div>{p.soRef && <div className="text-xs text-gray-400">SO: {p.soRef}</div>}</div> },
    { header: "Date", cell: (p) => fmtDate(p.date) },
    { header: "Expected", cell: (p) => fmtDate(p.expectedDelivery) },
    { header: "Value", cell: (p) => <span className="font-bold">{fmtINR(p.grandTotal)}</span> },
    { header: "Status", cell: (p) => <StatusBadge value={p.status} /> },
    {
      header: "Actions", cell: (p) => (
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setPrintDoc(p)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">🖨 Print</button>
          <button onClick={() => { setForm({ ...p }); setEditingId(p.poNo || p._id); setShowForm(true); }} className="px-2 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded font-medium">Edit</button>
          {!["Received", "Closed", "Cancelled"].includes(p.status) && <button onClick={() => handleMarkReceived(p)} className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium">✓ Received</button>}
          <button onClick={() => handleDelete(p.poNo || p._id)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium">Del</button>
        </div>
      )
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Purchase Order" company={company} onClose={() => setPrintDoc(null)} />}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Purchase Order" : "New Purchase Order"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Supplier *</label>
                  {suppliers.length > 0 ? (
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none" onChange={e => handleSupplierSelect(e.target.value)} defaultValue="">
                      <option value="">Select supplier…</option>
                      {suppliers.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.supplier.name} onChange={e => setForm(f => ({ ...f, supplier: { ...f.supplier, name: e.target.value } }))} placeholder="Supplier name" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">SO Reference</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.soRef || ""} onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))} placeholder="SO-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Expected Delivery</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expectedDelivery ? form.expectedDelivery.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Terms</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                    {["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Address</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Where should goods be delivered?" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Acknowledged", "Partially Received", "Received", "Closed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="poInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: recalc(f.items, is) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="poInterState" className="text-sm font-medium text-gray-700">Inter-State supply (IGST)</label>
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
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Grand Total</span><span className="text-cyan-700">{fmtINR(totals.grandTotal)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-medium disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update PO" : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Purchase / Purchase Orders" title="Purchase Orders" subtitle="Plan material against customer orders, track receipts and supplier-wise delivery" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total POs" value={orders.length} />
        <Kpi label="Pending Receipt" value={pending} tone="warning" />
        <Kpi label="Received" value={received} tone="success" />
        <Kpi label="PO Value" value={fmtINR(totalValue)} tone="accent" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Purchase Order</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-cyan-200 border-t-cyan-700 rounded-full" /></div> : (
        <DataTable rows={orders} columns={columns} searchKeys={["poNo", "supplier.name", "soRef", "status"]} />
      )}
    </>
  );
}

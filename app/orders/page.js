"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSalesOrders, createSalesOrder, updateSalesOrder, deleteSalesOrder,
  createDNFromSO, createInvoiceFromSO, calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const emptyForm = {
  customer: { id: "", name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  poReference: "", quotationRef: "", proformaRef: "", deliveryAddress: "",
  expectedDelivery: "", salesperson: "", notes: "", termsAndConditions: "",
  isInterState: false, status: "Confirmed",
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
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
      const [so, c, cust] = await Promise.all([
        getSalesOrders(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => [])
      ]);
      setOrders(so);
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
    const addr = [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", ");
    setForm(f => ({
      ...f,
      isInterState,
      customer: {
        id: c._id || c.id,
        name: c.name,
        address: addr,
        gstNumber: c.gstNumber || "",
        state: c.address?.state || "",
        contactPerson: c.contactPerson?.name || "",
        email: c.contactPerson?.email || "",
        phone: c.contactPerson?.phone || ""
      },
      deliveryAddress: addr,
      items: recalc(f.items, isInterState)
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (o) => {
    const isInterState = !!o.isInterState;
    setForm({
      ...emptyForm,
      ...o,
      customer: {
        id: o.customer?.id || o.customer?._id || "",
        name: o.customer?.name || "",
        address: o.customer?.address || o.deliveryAddress || "",
        gstNumber: o.customer?.gstNumber || "",
        state: o.customer?.state || "",
        contactPerson: o.customer?.contactPerson || "",
        email: o.customer?.email || "",
        phone: o.customer?.phone || "",
      },
      deliveryAddress: o.deliveryAddress || o.customer?.address || "",
      items: (o.items || []).map(item => calcItem(item, isInterState)),
    });
    setEditingId(o.soNo || o._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer?.name) return showToast("Customer required", "error");
    setSaving(true);
    try {
      const payload = { ...form, ...calcTotals(form.items, form.isInterState) };
      if (editingId) {
        await updateSalesOrder(editingId, payload);
        showToast("Sales Order updated");
      } else {
        await createSalesOrder(payload);
        showToast("Sales Order created");
      }
      setShowForm(false);
      load();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this sales order?")) return;
    try { await deleteSalesOrder(id); showToast("Deleted"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleCreateDN = async (so) => {
    try { const dn = await createDNFromSO(so.soNo || so._id, {}); showToast(`Delivery Note ${dn.dnNo} created`); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleCreateInvoice = async (so) => {
    try { const inv = await createInvoiceFromSO(so.soNo || so._id, {}); showToast(`Invoice ${inv.invoiceNo} created`); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const totalValue = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const confirmed = orders.filter(o => o.status === "Confirmed").length;
  const inProgress = orders.filter(o => ["In Progress", "Partially Delivered"].includes(o.status)).length;
  const closed = orders.filter(o => ["Delivered", "Invoiced", "Closed"].includes(o.status)).length;

  const columns = [
    { header: "SO No.", cell: (o) => <Link href={`/orders/${o.soNo || o._id}`} className="font-bold text-green-600 hover:underline">{o.soNo}</Link> },
    {
      header: "Customer",
      cell: (o) => (
        <div>
          <div className="font-medium text-gray-900">{o.customer?.name}</div>
          <div className="text-xs text-gray-400 flex gap-2">
            {o.poReference && <span>PO: {o.poReference}</span>}
            {o.quotationRef && <span>QT: {o.quotationRef}</span>}
          </div>
        </div>
      )
    },
    { header: "Date", cell: (o) => fmtDate(o.date) },
    { header: "Expected", cell: (o) => fmtDate(o.expectedDelivery) },
    { header: "Value", cell: (o) => <span className="font-bold">{fmtINR(o.grandTotal)}</span> },
    { header: "Status", cell: (o) => <StatusBadge value={o.status} /> },
    {
      header: "Actions", cell: (o) => {
        const hasDN = o.deliveryNotes && o.deliveryNotes.length > 0;
        const hasInv = o.invoices && o.invoices.length > 0;
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={() => setPrintDoc(o)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">🖨 Print</button>
            
            {hasDN ? (
              <Link
                href={`/deliveries/${o.deliveryNotes[0]}`}
                className="px-2.5 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>👁 View DN</span>
                <span className="font-mono text-[11px]">({o.deliveryNotes[0]})</span>
              </Link>
            ) : (
              <button onClick={() => handleCreateDN(o)} className="px-2 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded font-medium">
                → DN
              </button>
            )}

            {hasInv ? (
              <Link
                href={`/invoices/${o.invoices[0]}`}
                className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>👁 View Inv</span>
                <span className="font-mono text-[11px]">({o.invoices[0]})</span>
              </Link>
            ) : (
              !hasDN && (
                <button onClick={() => handleCreateInvoice(o)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded font-medium">
                  → Inv
                </button>
              )
            )}

            {!hasDN && !hasInv && (
              <button onClick={() => openEdit(o)} className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium">Edit</button>
            )}

            <button onClick={() => handleDelete(o.soNo || o._id)} className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded font-medium">Del</button>
          </div>
        );
      }
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Sales Order" company={company} onClose={() => setPrintDoc(null)} />}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Sales Order" : "New Sales Order"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white mb-1.5"
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer PO Reference</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.poReference || ""} onChange={e => setForm(f => ({ ...f, poReference: e.target.value }))} placeholder="Customer's PO Number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Quotation Ref</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.quotationRef || ""} onChange={e => setForm(f => ({ ...f, quotationRef: e.target.value }))} placeholder="QT-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Proforma Ref</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.proformaRef || ""} onChange={e => setForm(f => ({ ...f, proformaRef: e.target.value }))} placeholder="PI-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Expected Delivery</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expectedDelivery ? form.expectedDelivery.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Salesperson</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.salesperson || ""} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Address</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Delivery / shipping address" />
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="soInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="soInterState" className="text-sm font-medium text-gray-700">Inter-State supply (IGST)</label>
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
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Grand Total</span><span className="text-green-600">{fmtINR(totals.grandTotal)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update SO" : "Create Sales Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Sales Orders" title="Sales Orders" subtitle="Confirmed customer purchase orders driving procurement, dispatch and invoicing" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Orders" value={orders.length} />
        <Kpi label="Confirmed" value={confirmed} tone="warning" />
        <Kpi label="In Progress" value={inProgress} tone="accent" />
        <Kpi label="Order Value" value={fmtINR(totalValue)} tone="success" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Sales Order</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" /></div> : (
        <DataTable rows={orders} columns={columns} searchKeys={["soNo", "customer.name", "poReference", "status"]} />
      )}
    </>
  );
}

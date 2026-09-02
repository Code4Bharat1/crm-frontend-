"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getDeliveryNotes, createDeliveryNote, updateDeliveryNote, deleteDeliveryNote,
  markDelivered, createInvoiceFromDN, getCompany, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const emptyForm = {
  soRef: "", customer: { name: "", address: "", contactPerson: "", phone: "" },
  deliveryAddress: "", transporter: "", vehicleNumber: "", lrNumber: "", notes: "",
  status: "Prepared",
  items: [{ description: "", hsnCode: "", qty: 1, unit: "Nos", serialNumbers: [], remarks: "" }],
};

export default function DeliveriesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deliverModal, setDeliverModal] = useState(null);
  const [receivedBy, setReceivedBy] = useState("");
  const [toast, setToast] = useState(null);
  const [postDeliveryModal, setPostDeliveryModal] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dn, c, cust] = await Promise.all([
        getDeliveryNotes(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => [])
      ]);
      setNotes(dn);
      setCompany(c);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch { /**/ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const addr = [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", ");
    setForm(f => ({ ...f, customer: { id: c._id || c.id, name: c.name, address: addr, contactPerson: c.contactPerson?.name || "", phone: c.contactPerson?.phone || "" }, deliveryAddress: addr }));
  };

  const handleSave = async () => {
    if (!form.soRef) return showToast("Sales Order reference required", "error");
    if (!form.customer.name) return showToast("Customer name required", "error");
    setSaving(true);
    try {
      if (editingId) {
        await updateDeliveryNote(editingId, form);
        showToast("Delivery Note updated");
      } else {
        await createDeliveryNote(form);
        showToast("Delivery Note created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this delivery note?")) return;
    try {
      await deleteDeliveryNote(id);
      showToast("Deleted");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleMarkDelivered = async () => {
    try {
      const updated = await markDelivered(deliverModal.dnNo || deliverModal._id, { receivedBy, deliveryDate: new Date() });
      showToast("Marked as Delivered ✓");
      setDeliverModal(null);
      setReceivedBy("");
      setPostDeliveryModal(updated);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToInvoice = async (d) => {
    try {
      const inv = await createInvoiceFromDN(d.dnNo || d._id);
      showToast(`Tax Invoice ${inv.invoiceNo} created from ${d.dnNo}!`);
      load();
      router.push(`/invoices/${inv.invoiceNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const dispatched = notes.filter(n => n.status === "Dispatched").length;
  const inTransit = notes.filter(n => n.status === "In Transit").length;
  const delivered = notes.filter(n => n.status === "Delivered").length;

  const columns = [
    { header: "DN No.", cell: (d) => <Link href={`/deliveries/${d.dnNo || d._id}`} className="font-bold text-orange-600 hover:underline">{d.dnNo}</Link> },
    { header: "Against SO", cell: (d) => <Link href={`/orders/${d.soRef}`} className="text-green-600 hover:underline font-medium">{d.soRef}</Link> },
    { header: "Customer", cell: (d) => d.customer?.name },
    { header: "Dispatch", cell: (d) => fmtDate(d.date) },
    { header: "Transporter", cell: (d) => <div><div>{d.transporter || "—"}</div>{d.lrNumber && <div className="text-xs text-gray-400">LR: {d.lrNumber}</div>}</div> },
    { header: "Items", cell: (d) => `${d.items?.length || 0} items` },
    { header: "Status", cell: (d) => <StatusBadge value={d.status} /> },
    {
      header: "Invoice Ref",
      cell: (d) => d.invoiceRef ? (
        <Link href={`/invoices/${d.invoiceRef}`} className="text-xs font-bold text-red-600 hover:underline">
          {d.invoiceRef}
        </Link>
      ) : (
        <span className="text-xs text-gray-400">Not Invoiced</span>
      )
    },
    {
      header: "Actions", cell: (d) => (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button onClick={() => setPrintDoc(d)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">🖨 Print</button>
          
          {d.invoiceRef ? (
            <Link
              href={`/invoices/${d.invoiceRef}`}
              className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>👁 View Inv</span>
              <span className="font-mono text-[11px]">({d.invoiceRef})</span>
            </Link>
          ) : (
            <>
              <button onClick={() => { setForm({ ...d }); setEditingId(d.dnNo || d._id); setShowForm(true); }} className="px-2 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded font-medium">Edit</button>
              {d.status !== "Delivered" && (
                <button onClick={() => { setDeliverModal(d); setReceivedBy(""); }} className="px-2.5 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-semibold transition-colors">
                  ✓ Delivered
                </button>
              )}
              <button
                onClick={() => handleConvertToInvoice(d)}
                className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-sm transition-all"
              >
                → Invoice
              </button>
            </>
          )}
          <button onClick={() => handleDelete(d.dnNo || d._id)} className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-red-600 rounded font-medium">Del</button>
        </div>
      )
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Delivery Note" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Post-Delivery Prompt to Generate Invoice */}
      {postDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border text-center animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delivery Confirmed!</h3>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{postDeliveryModal.dnNo}</strong> has been marked as Delivered to{" "}
              <strong>{postDeliveryModal.customer?.name}</strong>.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  const d = postDeliveryModal;
                  setPostDeliveryModal(null);
                  handleConvertToInvoice(d);
                }}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
              >
                🧾 Convert to Tax Invoice Now
              </button>
              <button
                onClick={() => setPostDeliveryModal(null)}
                className="w-full py-2 px-4 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Keep as Delivered
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivered Modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">Mark as Delivered</h3>
            <p className="text-sm text-gray-500 mb-4">{deliverModal.dnNo} — {deliverModal.customer?.name}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Received By</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Name of receiver" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeliverModal(null)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleMarkDelivered} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Delivery Note" : "New Delivery Note"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Order Ref *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.soRef} onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))} placeholder="SO-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer *</label>
                  {customers.length > 0 ? (
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white" onChange={e => handleCustomerSelect(e.target.value)} defaultValue="">
                      <option value="">Select customer…</option>
                      {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customer.name} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))} placeholder="Customer name" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Transporter</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transporter || ""} onChange={e => setForm(f => ({ ...f, transporter: e.target.value }))} placeholder="Transport company" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle No.</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vehicleNumber || ""} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="MH12AB1234" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">LR Number</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lrNumber || ""} onChange={e => setForm(f => ({ ...f, lrNumber: e.target.value }))} placeholder="Lorry Receipt No." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Prepared", "Dispatched", "In Transit", "Delivered", "Returned", "Partial"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Delivery Address</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Items (with Serial Numbers)</label>
                <LineItemsEditor items={form.items} isDelivery={true} onChange={items => setForm(f => ({ ...f, items }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update DN" : "Create Delivery Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Delivery Notes" title="Delivery Notes" subtitle="Material dispatch with serial numbers, transport details and delivery confirmation" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Notes" value={notes.length} />
        <Kpi label="Dispatched" value={dispatched} tone="warning" />
        <Kpi label="In Transit" value={inTransit} tone="warning" />
        <Kpi label="Delivered" value={delivered} tone="success" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Delivery Note</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full" /></div> : (
        <DataTable rows={notes} columns={columns} searchKeys={["dnNo", "soRef", "customer.name", "status", "lrNumber", "invoiceRef"]} />
      )}
    </>
  );
}
